# Better Harness 全量分析报告

- 项目：yiquantea-com（懿泉茶业官网，Cloudflare 架构）
- 分析时间：2026-08-12
- 范围：src/ 全量 .ts/.tsx（207 个文件）、配置文件、drizzle schema、设计文档
- 方式：只读静态分析，未修改任何文件
- 统计：严重 5 / 中等 8 / 建议 6

---

## 维度一：代码质量

### 1.1 console.log / console.error 残留
- 严重程度：建议
- 文件：
  - `src/lib/email.ts:16-18`（dev 分支打印收件人、主题、正文前 200 字）
  - `src/lib/email.ts:39`、`src/lib/captcha.ts:21`、`src/lib/backup.ts:65`、`src/lib/api-helpers.ts:102`（console.error）
- 问题：开发期日志散落在工具库。email.ts 的 dev 日志会把邮件正文写到服务器日志，生产虽不进 dev 分支，但日志策略不统一。
- 修复方向：统一改用结构化日志（如 wrangler tail 友好的 JSON），或封装 `logger.dev/logger.error`，生产关闭 dev 级别日志。

### 1.2 TypeScript any 滥用
- 严重程度：无
- 结论：全量搜索 `as any / : any / any[] / <any>` 命中 0 处，类型纪律良好。

### 1.3 过长函数 / 大组件
- 严重程度：建议
- 文件：
  - `src/components/admin/ShowcaseAdmin.tsx`（418 行）
  - `src/components/admin/HomepageAdmin.tsx`（378 行）
  - `src/components/admin/InquiryAdmin.tsx`（357 行）
  - `src/components/admin/AnalyticsAdmin.tsx`（343 行）
- 问题：单个客户端组件过大，状态集中、可读性与可维护性下降，首屏 JS 体积偏大。
- 修复方向：按子区块拆分子组件，配合动态导入（next/dynamic）做代码分割。

### 1.4 重复代码
- 严重程度：建议
- 现象：各 API route 的 `requireUser + isFail return + parseBody + try/catch` 模板高度重复（已由 api-helpers.ts 抽象，但仍逐个手写）。
- 修复方向：可考虑封装一个 `withAuth(handler, roles)` 高阶包装器，减少样板。

### 1.5 未完成的 TODO
- 严重程度：中等
- 文件：`src/components/layout/GDPRConsentBanner.tsx:28`
- 问题：注释明确写着「TODO 阶段 8：同步写入 Neon gdpr_consents 表」，即用户同意记录未落库。
- 影响：GDPR 合规要求留存同意凭证，当前仅前端状态，属合规缺口。
- 修复方向：在用户同意时调用 `POST /api/gdpr/consent`（该接口已存在，需确认其落库逻辑）。

### 1.6 错误处理
- 严重程度：建议
- 现象：未发现把 `error.stack / error.message` 直接回给客户端的情况（grep 0 命中）；api-helpers 统一用 `fail(msg, status)` 返回简短错误，未泄露堆栈。良好。
- 但多处 `catch { /* 吞掉 */ }`（如 r2.ts 上传失败降级占位、b2b.ts KV 解析失败兜底），失败链路不可观测，建议补日志。

---

## 维度二：安全（重点）

### 2.1 【严重】AUTH_SECRET 缺省为空字符串
- 严重程度：严重
- 文件：`src/lib/auth.ts:8`
- 代码：`const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');`
- 问题：若部署时忘记设置 `AUTH_SECRET`，JWT 将用「空密钥」签名与校验。jose 对空字符串 HS256 密钥不报错，任何人都能用空密钥伪造一份 `role:'admin'` 的合法 JWT，直接获得后台全部权限。同时 `hashPassword` 也用 AUTH_SECRET 当盐，空盐会大幅削弱密码哈希。
- 修复方向：模块加载时校验 `process.env.AUTH_SECRET` 长度（≥32），缺失即 `throw`，让应用启动失败而非裸奔。

### 2.2 【严重】KV 全局单例未注入生产环境绑定
- 严重程度：严重
- 文件：`src/lib/kv.ts:40`
- 代码：`export const kv: KVClient = createKVClient();`（未传 env）
- 问题：`createKVClient(env)` 只有在收到 `env.YIQUANTEA_KV` 时才用真 KV，否则回退到进程内存 Map。模块顶层导出的 `kv` 没传 env，因此 api-helpers.ts、rate-limit、b2b.ts 引用的 `kv` 在生产始终是内存 Map。后果：
  - 登录限流、公开接口限流（60/min）失效——每个 Worker isolate 各自计数，攻击者可绕过。
  - 连续 5 次密码错误锁定虽写在 Neon（仍有效），但限流失效仍可撞库。
  - B2B 24h token 的 KV 快路径失效，每次校验都落 Neon（性能下降，但功能仍可用）。
- 修复方向：在 Pages/Workers 运行时通过 `getRequestContext().env` 取绑定构造 KV 客户端，或在中间件层注入 env，不再用无参单例。

### 2.3 【严重】hCaptcha 缺失即放行 + 故障即放行
- 严重程度：严重
- 文件：`src/lib/captcha.ts:8` 与 `captcha.ts:23`
- 问题：`if (!secret) return true;`——若上线时未配置 `HCAPTCHA_SECRET_KEY`，询价/样品表单的人机验证完全失效，可被脚本批量刷提交。`catch` 分支也 `return true`，验证服务偶发故障时同样放行（可用性优先策略，但应至少告警）。
- 修复方向：生产环境强制要求 `HCAPTCHA_SECRET_KEY` 存在，缺失则启动报错或表单不可提交；故障分支改为「失败计数 + 阈值后熔断」而非无条件放行。

### 2.4 【严重】wrangler 部署配置错误，上线即失败
- 严重程度：严重
- 文件：`wrangler.toml:4`、`package.json:15`
- 问题：
  1. `main = "src/worker.ts"`，但 `src/worker.ts` 文件不存在（Test-Path 返回 False）。
  2. 项目依赖 `@cloudflare/next-on-pages`（Pages 部署模式），但 `deploy` 脚本是 `wrangler deploy`（Workers 部署命令），且 wrangler.toml 未声明 `pages_build_output_dir`。
  3. 二者矛盾：要么补 `src/worker.ts` 走 Workers，要么改用 Pages 流程（先 `npx @cloudflare/next-on-pages` 生成 `.vercel/output`，再 `wrangler pages deploy`）。
- 影响：直接执行 `npm run deploy` 必然失败，属于上线阻塞项。
- 修复方向：明确部署目标为 Cloudflare Pages，调整 wrangler.toml（删 `main`、加 `pages_build_output_dir = ".vercel/output/static"` 之类），并把 deploy 脚本改为 `next-on-pages` 构建 + `wrangler pages deploy`。

### 2.5 【严重】KV namespace id 疑似缺一位
- 严重程度：严重（需人工确认）
- 文件：`wrangler.toml:18`
- 值：`id = "260f93d1e2b64f1886fd3e41aa3a92f"`（31 位十六进制）
- 问题：Cloudflare KV namespace id 标准为 32 位十六进制。当前 31 位，疑似复制时丢字符。若 id 不正确，部署绑定到错误或不存在命名空间，限流/B2B token 会写到错误位置或直接报错。
- 修复方向：登录 Cloudflare 后台核对真实 KV namespace id，补齐。标注「需人工确认」。

### 2.6 【中等】'sales' 角色未在枚举中
- 严重程度：中等
- 文件：`src/app/api/products/[id]/images/route.ts:18`、`drizzle/schema/users.ts:6`
- 问题：`requireUser(['admin', 'sales'])` 中的 `'sales'` 不在 `userRoleEnum(['admin','editor','customer_service'])` 内，AuthUser.role 联合类型也无 `'sales'`。后果：
  - 数据库不可能存在 role='sales' 的用户，该角色判断恒为 false。
  - 编辑（editor）无法上传产品图片（POST /api/products/[id]/images 需要 admin 或 sales），与「编辑可管理内容」的权限设计相悖。
- 修复方向：将 `'sales'` 改为 `'editor'`（或按业务定义补 `sales` 到枚举与 AuthUser 类型）。

### 2.7 【中等】密码校验非常量时间比较
- 严重程度：中等
- 文件：`src/lib/auth.ts:66`
- 代码：`return hashedInput === hash;`
- 问题：字符串 `===` 比较会在首个不同字节短路，存在理论计时侧信道。叠加 2.1 的空盐问题，风险被放大。
- 修复方向：用 Web Crypto 的 `crypto.subtle.timingSafeEqual`（或等长恒定时间比较）。

### 2.8 【中等】上传仅校验客户端 MIME，无魔数校验
- 严重程度：中等
- 文件：`src/app/api/upload/route.ts:40`
- 问题：`file.type` 由浏览器随 FormData 上报，可被任意伪造。攻击者可上传 `.jpg` 后缀的恶意脚本并把 MIME 伪造成 `image/jpeg` 通过校验，写入 R2。虽 R2 公开桶默认不执行，但若被当作图片渲染或后续处理存在风险。
- 修复方向：读取文件前若干字节做 magic number 校验（JPEG `FFD8`、PNG `89504E47`、WebP `52494646`、MP4 `ftyp`）。

### 2.9 【中等】硬编码联系电话绕过后台配置
- 严重程度：中等
- 文件：
  - `src/components/layout/Footer.tsx:42,45`（`+86 15515928905`、`WhatsApp +86 13333827003` 直接写死）
  - `src/components/sample/SampleRequestForm.tsx:166,172`
- 问题：contact 页面用了 `site?.contactPhone || '+86 15515928905'` 的兜底写法（合理），但 Footer.tsx 是纯硬编码，不读取 site 配置。后台改了电话，页脚不变，数据不一致。
- 修复方向：Footer 也改为读取 site 配置 + 兜底，统一来源。

### 2.10 【建议】JSON-LD 的 dangerouslySetInnerHTML
- 严重程度：建议
- 文件：`src/app/(front)/[locale]/(main)/products/[slug]/page.tsx:52`
- 问题：`dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}`。若产品名/描述中含 `</script>` 字样，会截断 script 标签造成 XSS（数据来自后台，可控性较高但非完全可信）。
- 修复方向：对序列化结果做 `<` 转义（替换 `<` 为 `\u003c`）。

### 2.11 SQL 注入
- 严重程度：无
- 结论：grep 原生 SQL 字符串拼接 0 命中；`db.execute(sql\`...\`)` 与 `sql\`${col} = ${val}\`` 均走 drizzle 参数化绑定，安全。

### 2.12 错误响应泄露堆栈
- 严重程度：无
- 结论：未发现把 error.stack/message 回写响应的行为；api-helpers 统一 `fail(msg,status)` 返回简短中文错误。

---

## 维度三：性能

### 3.1 图片懒加载
- 严重程度：无（良好）
- 现象：存在 `src/components/ui/LazyImage.tsx` + `src/hooks/useLazyLoad.ts`（IntersectionObserver，提前 200px 预加载）；next.config.mjs 已 `images.unoptimized=true` 适配 Cloudflare。图片懒加载机制完备。

### 3.2 大型客户端组件
- 严重程度：建议
- 文件：见 1.3。后台组件普遍 300+ 行且为客户端组件，首屏 JS 偏大。
- 修复方向：动态导入 + 拆分。

### 3.3 前台列表分页
- 严重程度：建议（需人工确认）
- 现象：`/api/products` 支持 `getPagination`（默认 25/页，上限 100），但前台商品列表页是否消费分页参数未逐一确认。
- 修复方向：人工核对前台 listing 页是否带 page/pageSize、是否做无限滚动或分页。

### 3.4 客户端数据请求
- 严重程度：建议
- 现象：后台模块普遍在客户端 useEffect 拉取数据（合理）。但 `src/lib/queries.ts`（263 行）集中了服务端查询，前台页面多用服务端组件直出，良好。

---

## 维度四：文档

### 4.1 设计文档完整性
- 严重程度：无
- 结论：`设计文档/` 下 18 份 .md（00-17）齐全，根目录 `开发施工总指令.txt` 存在。符合「17 份设计文档 + 1 份施工总指令」要求。

### 4.2 README 缺失
- 严重程度：中等
- 现象：根目录无 README.md（Glob `README*` 命中 0）。仅有一份资产档案 `.md`。
- 影响：新人无法快速上手、CI/部署流程无入口说明。
- 修复方向：补一份 README，至少含：技术栈、环境变量准备、本地开发、构建部署、DB 迁移命令。

### 4.3 代码注释覆盖
- 严重程度：无（良好）
- 现象：各 lib 文件、schema、API route 顶部均有中文功能注释，关键逻辑有行内说明，注释密度较高。

---

## 维度五：可上线性

### 5.1 wrangler.toml 配置
- 严重程度：严重（同 2.4）
- 问题：`main=src/worker.ts` 文件缺失；未声明 `pages_build_output_dir`；deploy 脚本与 Pages 模式不匹配。上线阻塞。

### 5.2 .env.example 完整性
- 严重程度：建议
- 现象：已列 DATABASE_URL、R2/KV/D1、AUTH_SECRET、ADMIN_USERNAME/PASSWORD、SHOWCASE_PASSWORD_KEY、RESEND_API_KEY、HCAPTCHA、限流、备份保留。
- 遗漏：`RATE_LIMIT_B2B` 在 .env.example 有，但 wrangler.toml vars 未列（wrangler vars 只有 PUBLIC/LOGIN/RETENTION）；`CF_ACCOUNT_ID / CF_IMAGES_API_TOKEN` 在记忆中提及但 .env.example 未列（若未用到可忽略，需人工确认）。
- 另：`ADMIN_USERNAME="13333827003"` 用了真实手机号作占位，建议改占位符。

### 5.3 阻塞性 TODO/FIXME/HACK
- 严重程度：中等（同 1.5）
- 现象：仅 1 处 TODO（GDPR 同步落库）。属合规阻塞项。

### 5.4 路由与认证守卫
- 严重程度：无（良好）
- 结论：65 个 API route，按方法维度统计，公开接口（login、gdpr/check、gdpr/consent、ip-detect、qrcode、search、showcase/verify-password、showcase/verify-token、inquiries guest 消息、view-log 回填）无 requireUser 属合理设计；其余写操作与敏感读接口均经 `requireUser` 或 `verifyShowcaseToken` 守卫。中间件明确放行 api/admin（由端点自行鉴权）。无裸奔管理接口。
- 残留注意：2.6 的 'sales' 死角色导致 editor 上传图片被拒（功能性缺口，非越权）。

### 5.5 D1/KV/R2 绑定名称
- 严重程度：无（名称一致）
- 结论：wrangler.toml 绑定名 `YIQUANTEA_KV / YIQUANTEA_D1 / YIQUANTEA_R2`，与代码 `env.YIQUANTEA_KV`（kv.ts）、`env.YIQUANTEA_D1`（db-d1.ts）、`env.YIQUANTEA_R2`（r2.ts 注释与函数签名）一致。
- 但见 2.2：代码未在运行时把 env 传给 kv 单例；见 2.5：KV id 疑缺一位。

---

## 额外检查

### A. 硬编码中文密码 / 手机号
- 严重程度：中等（同 2.9）
- 命中：`13333827003`（WhatsApp 号）出现在 contact/page.tsx（兜底，合理）、Footer.tsx（硬编码，不合理）、SampleRequestForm.tsx（硬编码）、SettingsAdmin.tsx（占位符，合理）、.env.example（ADMIN_USERNAME，建议改占位）。
- `15515928905` 出现在 contact（兜底）、Footer（硬编码）、SettingsAdmin（占位）。
- 未发现硬编码密码明文（ADMIN_PASSWORD 在 .env.example 用 `***` 占位）。

### B. 已知高危依赖
- 严重程度：中等
- `npm audit` 结果：13 个漏洞（1 low / 7 moderate / 5 high）。
- 高危集中在传递依赖 `undici`（6 条）与 `ws`（2 条），上级为 `miniflare`（wrangler 生态）。「No fix available」。
- 影响：主要在构建/本地调试链路（miniflare），生产运行时（Workers/Pages）不直接打包这些。仍建议关注 wrangler 升级。
- 顶层依赖：next 14.2、drizzle-orm 0.30、video.js 8.10 等无已知 critical 公告（需人工确认最新 CVE）。

---

## 第二部分：严重问题清单（按优先级）

1. 【部署阻塞】wrangler.toml `main=src/worker.ts` 文件不存在 + deploy 脚本用 `wrangler deploy`，与 next-on-pages Pages 模式冲突，上线即失败。
2. 【鉴权击穿】AUTH_SECRET 未设置时默认空字符串，可用空密钥伪造 admin JWT（src/lib/auth.ts:8）。
3. 【限流失效】KV 全局单例未注入生产 env，限流/登录锁定/B2B token 走内存，跨请求失效（src/lib/kv.ts:40）。
4. 【反爬失效】hCaptcha 密钥未配置即放行、验证服务故障也放行，上线漏配则表单无防护（src/lib/captcha.ts:8,23）。
5. 【绑定可疑】KV namespace id 31 位（应为 32），疑似丢字符，部署可能绑定错误命名空间（wrangler.toml:18，需人工确认）。

---

✅ Better Harness 全量分析完成。发现 5 个严重问题、8 个中等问题、6 个建议。详细报告已保存。
