# 懿泉茶业 YiQuanTea.com — API 接口设计

> **版本**: v1.0（Cloudflare 全栈版） | **日期**: 2026-08-11
>
> **本文档定位**：全部 API 接口的"技术规格书"——每个接口的地址、参数、返回值、权限要求，精确到字段级。
> **阅读对象**：开发人员。

---

## 〇、通用规范

### 认证方式

| 接口类型 | 认证方式 |
|:-----|:-----|
| 公开接口（前台只读） | 无需认证 |
| 管理员接口 | Cookie 中的 `auth_token`（JWT），由 jose 签发校验 |
| B2B 密码验证 | 独立密码验证，签发 24 小时 token（存 KV） |
| 客户聊天 | 询价 token（URL 参数） |

### 通用响应格式

```typescript
// 成功
{ "success": true, "data": { ... }, "total"?: number, "page"?: number }

// 错误
{ "success": false, "error": "错误描述信息" }

// 分页（列表接口）
{ "success": true, "data": [...], "total": 150, "page": 1, "pageSize": 25 }
```

### ★关键变化（老版→新版）

| 变化点 | 说明 |
|:-----|:-----|
| API 运行环境 | 从 Node.js 服务器 → Cloudflare Workers（Edge Runtime） |
| 数据库驱动 | 从 Prisma TCP 连接 → Drizzle + Neon HTTP 连接 |
| 会话管理 | 从 NextAuth cookie → 自写 JWT cookie（jose） |
| 限流实现 | 从 Redis → Cloudflare KV |
| 定时任务 | 从 node-cron → Workers Cron Triggers |

### 限流规则（不变）

| 接口类型 | 限制 | 时间窗口 | 实现 |
|:-----|:-----|:-----|:-----|
| 公开读取 | 60 次 | 1 分钟 / IP | KV 计数 |
| 登录 | 5 次 | 1 分钟 / IP | KV 计数 |
| B2B 密码验证 | 5 次 | 30 分钟 / IP | KV 计数 |
| 询价提交 | 3 次 | 5 分钟 / IP | KV 计数 |
| 文件上传 | 10 次 | 1 分钟 / IP | KV 计数 |

---

## 一、认证 API — `/api/auth`

### 1.1 登录
```
POST /api/auth/login

请求体:
{
  "username": "13333827003",
  "password": "***"
}

→ 200: { "success": true, "data": { "user": { id, username, name, role }, "token": "jwt..." } }
→ 401: { "success": false, "error": "账号或密码错误" }
→ 429: { "success": false, "error": "账号已锁定，请15分钟后再试", "lockedUntil": "ISO时间" }

说明：
- ★和老版的区别：老版用 NextAuth.js 处理登录，新版用 jose 签发 JWT。
  对前端来说，一样的——都是发 POST 请求，拿到 token 后存在 Cookie 里。
- JWT 有效期 1 小时
- 密码使用 Web Crypto API SHA-256 验证（非 bcrypt）
- 连续输错 5 次锁定 15 分钟
- 登录成功后设置 httpOnly Cookie `auth_token`
```

### 1.2 获取当前用户
```
GET /api/auth/me (需认证)

→ 200: { "success": true, "data": { "id", "username", "name", "role", "lastActivityAt" } }
→ 401: { "success": false, "error": "未登录" }
```

### 1.3 退出登录
```
POST /api/auth/logout (需认证)

→ 200: { "success": true }

说明：清除 Cookie `auth_token`，不需要调后端接口，前端直接清 Cookie 即可。
```

---

## 二、分类 API — `/api/categories`

| 方法 | 路径 | 认证 | 说明 |
|:-----|:-----|:-----|:-----|
| GET | `/api/categories?locale=zh` | 否 | 获取分类树（嵌套 children，含 productCount） |
| GET | `/api/categories/[id]` | 否 | 获取单个分类 |
| POST | `/api/categories` | 是 | 新增分类 |
| PUT | `/api/categories/[id]` | 是 | 编辑分类 |
| DELETE | `/api/categories/[id]` | 是 | 删除分类（产品自动移入"00 未分类"） |
| PUT | `/api/categories/[id]/sort` | 是 | 排序（direction: "up" \| "down"） |

---

## 三、★ B2B 展示区 API — `/api/showcase`

### 3.1 获取 B2B 分类列表（公开）
```
GET /api/showcase/categories?locale=zh

响应:
{
  "success": true,
  "data": [{
    "id", "nameZh", "nameEn", "slug", "image",
    "descriptionZh", "descriptionEn",
    "productCount": 12,
    "hasPassword": true      // 始终为 true
  }]
}
```

### 3.2 获取单个 B2B 分类（管理员）
```
GET /api/showcase/categories/[id] (需认证，仅 admin)

响应:
{ "success": true, "data": { id, nameZh, nameEn, slug, image,
  descriptionZh, descriptionEn, sortOrder, isActive, parentId, productCount } }
```

### 3.3 创建 B2B 分类（管理员）
```
POST /api/showcase/categories (需认证，仅 admin)

请求体:
{
  "nameZh": "自包装成品礼盒",
  "nameEn": "Self-Packaged Gift Boxes",
  "password": "abc123",           // ★明文，服务端 AES 加密存储
  "image": "/uploads/xxx.webp",   // 可选
  "descriptionZh": "...",          // 可选
  "descriptionEn": "...",          // 可选
  "parentId": null,                // 可选
  "sortOrder": 0
}
→ 200: { "success": true, "data": { "id", "nameZh", "slug" } }
```

### 3.4 编辑 B2B 分类（管理员）
```
PUT /api/showcase/categories/[id] (需认证，仅 admin)

请求体（所有字段可选）:
{ nameZh, nameEn, image, descriptionZh, descriptionEn, sortOrder, isActive, parentId }
```

### 3.5 删除 B2B 分类（管理员）
```
DELETE /api/showcase/categories/[id] (需认证，仅 admin)

说明：删除分类，关联 showcase_products 全部删除，产品本身不删除
```

### 3.6 修改 B2B 密码（管理员）
```
PUT /api/showcase/categories/[id]/password (需认证，仅 admin)

请求体:
{ "newPassword": "newpass123" }   // ★明文，服务端 AES 加密后存储

→ 200: { "success": true }
```

### 3.7 查看 B2B 密码明文（管理员）
```
GET /api/showcase/categories/[id]/password (需认证，仅 admin)

请求体:
{ "adminPassword": "当前管理员密码" }  // ★二次验证

→ 200: { "success": true, "data": { "password": "abc123" } }
```

### 3.8 ★ B2B 密码验证（公开，签发 24h Token）
```
POST /api/showcase/verify-password

请求体:
{ "categorySlug": "self-packaged-gift-boxes", "password": "abc123" }

→ 200: { "success": true, "data": { "token": "uuid-token", "expiresAt": "ISO时间" } }
→ 401: { "success": false, "error": "密码错误" }
→ 429: { "success": false, "error": "密码错误次数过多，请30分钟后再试" }

说明：
- ★和老版的区别：token 验证从查 Neon 表改为查 KV（更快，全球同步）
- 密码错误不提示还剩几次
- 同一 IP 5 次/30 分钟限流（通过 KV 实现）
- 成功后签发 token，前端存 localStorage，24h 有效
```

### 3.9 验证 B2B Token
```
POST /api/showcase/verify-token

请求体:
{ "categorySlug": "self-packaged-gift-boxes", "token": "uuid-token" }

→ 200: { "success": true, "data": { "valid": true, "expiresAt": "ISO时间" } }
→ 401: { "success": false, "error": "Token无效或已过期" }
```

### 3.10 B2B 分类产品列表（需有效 Token）
```
GET /api/showcase/categories/[slug]/products?locale=zh&page=1&pageSize=25

Headers: X-B2B-Token: "uuid-token"

→ 200: { "success": true, "data": [{ id, nameZh, nameEn, slug, thumbnail,
  priceCNY, priceUSD, spec }], "total", "page", "pageSize" }
```

### 3.11 管理 B2B 分类下的产品（管理员）
```
POST /api/showcase/categories/[id]/products (需认证)
请求体: { "productId": "xxx", "showcaseLocale": "hu", "sortOrder": 0 }
→ 将产品添加到该展示区分类

DELETE /api/showcase/categories/[id]/products (需认证)
请求体: { "productId": "xxx" }
→ 将产品从该展示区分类移除

PUT /api/showcase/categories/[id]/products/sort (需认证)
请求体: { "productIds": ["id1", "id2", ...] }
→ 批量排序
```

---

## 四、产品 API — `/api/products`

### 4.1 产品列表
```
GET /api/products?categoryId=xxx&locale=zh&page=1&pageSize=25&search=关键词

→ 200: { "success": true, "data": [{ id, sku, nameZh, nameEn, slug, categoryName,
  priceCNY, priceUSD, spec, status, thumbnail }], "total", "page", "pageSize" }

说明：分页默认 25 条/页。status 参数仅管理员可用（`&status=all` 需认证）。
```

### 4.2 产品详情
```
GET /api/products/[id]?locale=zh

→ 200: { "success": true, "data": {
  id, sku, nameZh, nameEn, slug, categoryId, categoryName,
  priceCNY, priceUSD, spec, status,
  images: [{ id, url, alt, sortOrder }],
  description, brewingGuide,
  ogTitle, ogDescription, ogImage,
  seoTitle, seoDesc, seoKeywords,
  showPriceInShowcase,
  videos: [{ url, type, title, thumbnail }],
  pageLayout: { layoutJson },
  showcaseCategories: [{ id, nameZh }],
  showcaseTranslations: [{ locale, description, brewingGuide }],
  recommended: [{ id, nameZh, nameEn, slug, thumbnail }]
} }

说明：下架产品需登录才能查看详情（否则返回 404）
```

### 4.3 新增产品（管理员）
```
POST /api/products (multipart/form-data, 需认证)

表单字段: nameZh, nameEn, categoryId, priceCNY, priceUSD, spec,
  showPriceInShowcase, layoutJson, videos (JSON), images (文件数组)

→ 200: { "success": true, "data": { "id", "slug" } }
```

### 4.4-4.6 编辑 / 删除 / 切换状态（不变）

---

## 五、★ 产品布局 API — `/api/products/[id]/layout`

```
GET /api/products/[id]/layout (需认证)
→ { "success": true, "data": { "layoutJson": "[...]" } }

PUT /api/products/[id]/layout (需认证)
请求体: { "layoutJson": "JSON字符串，7个区块的顺序和显示/隐藏" }
→ { "success": true }
```

---

## 六、★ 产品视频 API — `/api/products/[id]/videos`

| 方法 | 路径 | 认证 | 说明 |
|:-----|:-----|:-----|:-----|
| GET | `/api/products/[id]/videos` | 否 | 获取产品视频列表 |
| POST | `/api/products/[id]/videos` | 是 | 上传视频/360°资源 |
| PUT | `/api/products/[id]/videos/[videoId]` | 是 | 编辑视频信息 |
| DELETE | `/api/products/[id]/videos/[videoId]` | 是 | 删除视频（同时删除 R2 文件） |

限制：MP4/MOV ≤50MB，360°图片 ≤20MB。

---

## 七、★ 询价 API — `/api/inquiries`

### 7.1 提交询价（含 hCaptcha）
```
POST /api/inquiries

请求体:
{
  "name", "email", "phone", "company", "country", "message",
  "items": [{ "productId", "productName", "quantity" }],
  "hcaptchaToken": "xxx"
}

→ 200: { "success": true, "data": { "id", "chatToken" } }
→ 400: { "success": false, "error": "人机验证失败" }

说明：
- hCaptcha 验证：开发阶段先跳过，上线前激活（一行配置切换）
- chatToken：客户后续聊天的身份凭证（存在 URL 参数中）
```

### 7.2-7.4 询价列表/详情/状态（需认证）
返回字段含 priority、assignedTo、source、unreadMessages。

### 7.5 ★ 聊天消息

```
GET /api/inquiries/[id]/messages?page=1 (需认证)
→ { "success": true, "data": [{ id, senderType, senderName, content, attachment, isRead, createdAt }] }

POST /api/inquiries/[id]/messages (需认证，客服发送)
请求体: { "content": "您好...", "attachment": "url" }
→ { "success": true, "data": { "id" } }

POST /api/inquiries/[id]/messages/guest (公开，客户前台发送)
请求体: { "content": "我想了解...", "name": "客户名" }
→ { "success": true, "data": { "id" } }

PATCH /api/inquiries/[id]/messages/read (需认证，标记已读)
→ { "success": true }
```

---

## 八、★ 样品申请 API — `/api/samples`

| 方法 | 路径 | 认证 | 说明 |
|:-----|:-----|:-----|:-----|
| POST | `/api/samples` | 否(需 hCaptcha) | 提交样品申请 |
| GET | `/api/samples?status=new&page=1` | 是 | 样品列表 |
| GET | `/api/samples/[id]` | 是 | 样品详情 |
| PATCH | `/api/samples/[id]/status` | 是 | 更新状态 + 物流单号 |
| DELETE | `/api/samples/[id]` | 是(仅 admin) | 删除记录 |

```
POST /api/samples
请求体:
{
  "name": "John Doe", "email": "john@example.com",
  "phone": "+36...", "company": "Tea Ltd",
  "country": "HU", "address": "Budapest...",
  "productId": "xxx", "productName": "金骏眉",
  "quantity": 3, "message": "...",
  "hcaptchaToken": "xxx"
}
→ { "success": true, "data": { "id", "status": "new" } }
```

### 样品状态流转

```
客户提交 → new（新申请）→ processing（处理中）
  → shipped（已发货，填物流单号）→ delivered（已签收）→ closed（已关闭）
```

---

## 九、★ 浏览分析 API — `/api/analytics`

| 方法 | 路径 | 认证 | 说明 |
|:-----|:-----|:-----|:-----|
| GET | `/api/analytics/overview?days=30` | 是 | 总览数据 |
| GET | `/api/analytics/views?days=30&limit=20` | 是 | 产品浏览排行 |
| GET | `/api/analytics/countries?days=30` | 是 | 国家分布 |
| POST | `/api/analytics/view-log` | 否 | 记录一次浏览 |
| PATCH | `/api/analytics/view-log/[viewId]` | 否 | 更新浏览时长 |

```
POST /api/analytics/view-log
请求体: { "productId": "xxx", "locale": "en", "source": "showcase", "referer": "https://..." }
→ { "success": true, "data": { "viewId": "xxx" } }

PATCH /api/analytics/view-log/[viewId]
请求体: { "durationMs": 45000 }
→ { "success": true }

说明：
- 浏览日志在客户端通过 sendBeacon 自动发送
- 服务端自动从 request.cf.country 提取国家信息（不需要 geoip-lite）
- durationMs 限制 ≤24 小时（86400000ms）
```

---

## 十、★ 备份 API — `/api/backup`（仅 admin）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| GET | `/api/backup` | 获取备份状态 + R2 文件列表 |
| POST | `/api/backup` | 手动触发备份（导出 SQL 存 R2） |
| GET | `/api/backup/[filename]` | 下载备份文件（文件名白名单防目录穿越） |

---

## 十一、★ GDPR API — `/api/gdpr`

```
GET /api/gdpr/check
→ { "success": true, "data": {
  "requiresConsent": true,    // 是否需要弹窗（IP 在欧盟 + 未同意过）
  "hasConsented": false,
  "country": "HU"
} }

POST /api/gdpr/consent
请求体: { "sessionId": "xxx", "consent": ["necessary", "analytics"] }
→ { "success": true }

说明：
- IP 判断不需要 geoip-lite，直接用 Workers 的 request.cf.country
- 同意记录存 D1（不占用主库资源）
```

---

## 十二、其余 API（与老版一致，仅列端点）

| API | 主要端点 |
|:-----|:-----|
| 二维码 | `GET /api/qrcode?url=...`（仅限本站域名） |
| IP 检测 | `GET /api/ip-detect`（返回国家代码） |
| 搜索 | `GET /api/search?q=keyword&locale=zh` |
| 文件上传 | `POST /api/upload`（type: image/video/chat，R2 存储） |
| 配置 | `GET/PUT /api/config/site` `/api/config/homepage` `/api/config/navigation` `/api/config/social` `/api/config/page/[key]` `/api/config/seo/[key]` |
| 日志 | `GET /api/logs?page=1`（仅 admin） |
| 员工 | `GET/POST /api/staff` `PUT/DELETE /api/staff/[id]`（仅 admin） |
| 统计 | `GET /api/stats/dashboard` |
| 评论 | `GET/POST /api/reviews` `PUT/DELETE /api/reviews/[id]` |
| 搜索关键词 | `GET/POST /api/search-keywords` |

---

## 十三、API 路由文件清单

```
src/app/api/
├── auth/             login.ts / logout.ts / me.ts
├── categories/       route.ts / [id]/route.ts / [id]/sort.ts
├── showcase/
│   ├── categories/   route.ts / [id]/route.ts / [id]/password.ts / [id]/products.ts
│   ├── products/     route.ts / [slug]/route.ts
│   ├── verify-password.ts
│   └── verify-token.ts
├── products/         route.ts / [id]/route.ts / [id]/status.ts
│                     / [id]/layout.ts / [id]/videos/route.ts / [id]/videos/[videoId].ts
├── inquiries/        route.ts / [id]/route.ts / [id]/status.ts
│                     / [id]/messages/route.ts / [id]/messages/read.ts / [id]/messages/guest.ts
├── samples/           route.ts / [id]/route.ts / [id]/status.ts
├── reviews/           route.ts / [id]/route.ts / [id]/status.ts
├── upload/            route.ts
├── qrcode/            route.ts
├── ip-detect/         route.ts
├── search/            route.ts
├── config/            site.ts / homepage.ts / navigation.ts / social.ts / page/[key].ts / seo/[key].ts
├── logs/              route.ts
├── staff/             route.ts / [id]/route.ts / [id]/status.ts
├── stats/             dashboard.ts
├── analytics/         overview.ts / views.ts / countries.ts / view-log.ts / view-log/[viewId].ts
├── backup/            route.ts / [filename].ts
└── gdpr/              check.ts / consent.ts
```

> 共 ~55 个路由文件，每个 Worker request handler 需独立处理请求、认证、限流、错误。

---

> 📌 下一份文档：《06-前台页面设计》——前台所有页面 UI 规格
