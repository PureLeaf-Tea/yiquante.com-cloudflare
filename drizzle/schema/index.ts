// Drizzle Schema 总入口（drizzle/schema/index.ts）
// 全部 33 张表在此统一导出；src/lib/db.ts 和 drizzle.config.ts 都指向本文件
//
// 表清单（按模块分组）：
// 1  用户认证：users
// 2  分类体系：categories / showcaseCategories / showcaseProducts / showcaseAccessTokens
// 6  产品体系：products / productImages / productTranslations / showcaseTranslations
//              / productPageLayouts / productVideos / recommendations
// 13 询价系统：inquiries / inquiryItems / chatMessages
// 16 样品申请：sampleRequests
// 17 客户评价：reviews / reviewImages
// 19 首页配置：homepageConfig / heroImages / sellingPoints / certifications / ctaButtons
// 24 站点内容：navigationItems / socialLinks / pageContents / siteConfig / seoSettings
// 29 运营支撑：searchKeywords / operationLogs / uploads / productViewLogs / gdprConsents
// 34  订单模块：customers / orders / orderItems（v2.0 订单管理系统新增）

export * from './users';
export * from './categories';
export * from './showcase';
export * from './products';
export * from './inquiries';
export * from './samples';
export * from './reviews';
export * from './homepage';
export * from './navigation';
export * from './social';
export * from './pages';
export * from './site';
export * from './seo';
export * from './search';
export * from './logs';
export * from './uploads';
export * from './analytics';
export * from './gdpr';
export * from './customers';
export * from './orders';
