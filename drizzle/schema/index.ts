// Drizzle Schema 总入口（drizzle/schema/index.ts）
// 阶段 2 会在这里定义全部 33 张表，并统一从本文件导出：
//   users / categories / showcaseCategories / showcaseProducts / showcaseAccessTokens
//   products / productImages / productTranslations / showcaseTranslations
//   productPageLayouts / productVideos / recommendations
//   inquiries / inquiryItems / chatMessages / sampleRequests
//   reviews / reviewImages / homepageConfig / heroImages / sellingPoints
//   certifications / ctaButtons / navigationItems / socialLinks / pageContents
//   siteConfig / seoSettings / searchKeywords / operationLogs / uploads
//   productViewLogs / gdprConsents
//
// 占位导出，保证 drizzle.config.ts 指向本文件时不报错
export {};
