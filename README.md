# 懿泉茶业 YiQuanTea.com（Cloudflare 全栈版）

## 1. 项目简介

懿泉茶业 B2B/B2C 茶叶电商官网：中/英/俄/德/西/法六语言，含产品展示、在线询价、B2B 密码展示区、样品申请、GDPR 合规与完整后台管理系统。基于 Cloudflare 全栈 Serverless 架构。

## 2. 技术栈

| 层 | 技术 |
|:---|:-----|
| 框架 | Next.js 14（App Router）+ TypeScript |
| 多语言 | next-intl（六语言 zh/en/ru/de/es/fr） |
| 数据库 | Neon Serverless PostgreSQL + Drizzle ORM（33 张表） |
| 缓存 | Cloudflare KV（限流计数、B2B 24h token） |
| 轻量存储 | Cloudflare D1（仅分析快照） |
| 文件存储 | Cloudflare R2（图片/视频/备份，双模访问：Workers 绑定 + S3 兼容 API） |
| 认证 | jose 自写 JWT（httpOnly Cookie，1 小时）+ Web Crypto SHA-256 密码哈希 |
| 人机验证 | hCaptcha（@hcaptcha/react-hcaptcha） |
| 邮件 | Resend HTTP API |
| 部署 | @opennextjs/cloudflare（OpenNext）→ Cloudflare Workers + wrangler |
| 样式 | Tailwind CSS |

## 3. 环境变量（对照 .env.example）

复制 `.env.example` 为 `.env` 后逐项填写：

| 变量 | 用途 | 敏感 |
|:-----|:-----|:--:|
| `DATABASE_URL` | Neon 连接串（postgresql:// 开头） | ★ |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 S3 兼容 API 凭据 | ★ |
| `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | R2 桶名（yiquantea-assets）与公开访问域 | |
| `KV_NAMESPACE_ID` / `D1_DATABASE_ID` | KV/D1 资源 ID | |
| `AUTH_SECRET` | JWT 签名密钥（≥32 位，缺失/过短应用拒绝启动） | ★ |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 超级管理员账号（种子创建，登录用） | ★ |
| `SHOWCASE_PASSWORD_KEY` | B2B 密码 AES-GCM 加密密钥（≥32 位） | ★ |
| `RESEND_API_KEY` | Resend 邮件 API 密钥 | ★ |
| `NEXT_PUBLIC_SITE_URL` | 站点地址（本地 http://localhost:3000，上线 https://yiquantea.com） | |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` / `HCAPTCHA_SECRET_KEY` | hCaptcha 双密钥（生产缺 secret 表单将被拒绝提交） | ★ |
| `BACKUP_RETENTION_DAYS` / `RATE_LIMIT_PUBLIC` / `RATE_LIMIT_LOGIN` / `RATE_LIMIT_B2B` | 备份保留天数与限流阈值 | |
| `CF_ACCOUNT_ID` / `CF_IMAGES_API_TOKEN` | Cloudflare Images 预留（未开通留空，代码自动降级） | ★ |

## 4. 本地开发

```bash
npm install        # 安装依赖
# 配置 .env（见上节）
npm run dev        # 启动开发服务器 http://localhost:3000
```

首次使用需初始化数据库并灌种子（见下节）。本地 KV 无真实绑定，自动回退进程内存模拟；`npm run preview` 可在 workerd 运行时本地预览生产行为。

## 5. 数据库

```bash
npm run db:generate   # drizzle-kit generate：由 schema 生成迁移 SQL
npm run db:push       # drizzle-kit push：直接同步表结构到 Neon
npm run db:migrate    # drizzle-kit migrate：执行迁移
npm run db:seed       # tsx seed/seed.ts：幂等种子（49 分类/14 产品/4 员工等，先查后插）
npm run db:studio     # drizzle-kit studio：本地数据查看（https://local.drizzle.studio）
```

## 6. 构建与部署（OpenNext 链）

```bash
npm run build     # next build（常规构建校验）
npm run preview   # opennextjs-cloudflare build && preview（workerd 本地模拟生产）
npm run deploy    # opennextjs-cloudflare build && deploy（构建并部署到 Cloudflare Workers）
```

部署前必须通过 `npx wrangler secret put <KEY>` 上传六项生产密钥：

1. `AUTH_SECRET`
2. `DATABASE_URL`
3. `RESEND_API_KEY`
4. `HCAPTCHA_SECRET_KEY`
5. `SHOWCASE_PASSWORD_KEY`
6. `ADMIN_PASSWORD`

非敏感变量已在 `wrangler.jsonc` 的 `[vars]` 声明；KV/D1/R2 绑定同在该文件配置。

## 7. 已知注意事项

1. **构建前必须停掉 dev/preview 进程**：Windows 下 `next dev`/`opennextjs-cloudflare preview` 与构建并行会锁 `.next`/`.open-next` 目录（EPERM）并可能损坏缓存；遇到 `.next` 相关 MODULE_NOT_FOUND 先删 `.next` 再重建。
2. **Next.js 14 已 EOL**：OpenNext 构建使用 `--dangerouslyUseUnsupportedNextVersion` 旗标放行（见 package.json preview/deploy 脚本），待安排 Next 15/16 升级批次后移除。
3. **npm audit 遗留漏洞（2026-08 复查）**：11 个（next/postcss/next-intl/eslint 链，5 moderate + 6 high），修复均需 Next 16 / next-intl 4 破坏性升级，归入 Next 升级批次统一处理；风险面为自托管 Next 服务的 DoS/缓存投毒类通告，本项目 images.unoptimized、无 CSP nonce、无 custom server，多数利用面不适用；生产运行时为 workerd，不运行 Node 版 Next 服务。原 undici/ws 漏洞链（miniflare/wrangler）已随 wrangler 升级 ^4.122.0 消除。
4. **OpenNext Windows 支持为官方声明的 best-effort**：正式 CI/CD 建议 Linux 环境。
5. **R2 桶公开访问**需在 Cloudflare 控制台开启后上传文件才可公网直访。
6. 备份当前为后台手动触发（JSON 导出存 R2），自动备份 Cron 待独立 scheduled Worker 实现。
7. **限流阈值当前硬编码在各调用点**（公开 60/min、登录 5/min、B2B 5/30min、上传 10/min 等）；RATE_LIMIT_* 环境变量为死配置已于 R6 移除，如需可配置化另行安排。

## 8. 文档

详细设计与操作说明见 `设计文档/`（00 架构总纲 ~ 17 三套环境划分规范，共 18 份）与 `开发施工总指令.txt`。
