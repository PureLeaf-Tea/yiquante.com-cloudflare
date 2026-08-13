import type { NextRequest } from 'next/server';
import type { AuthUser } from '@/lib/auth';
// GET/POST /api/backup — 备份管理（05 号文档 §十，仅 admin）
// GET：备份状态 + R2 文件列表；POST：导出主要表 JSON → 真实上传 R2（收尾任务 3）
// R2 凭据未配置时返回演练模式（向后兼容）
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import {
  products, productTranslations, categories, productImages, productVideos, productPageLayouts,
  recommendations, inquiries, inquiryItems, chatMessages, sampleRequests, reviews, reviewImages,
  users, uploads, homepageConfig, heroImages, sellingPoints, certifications, ctaButtons,
  navigationItems, pageContents, siteConfig, seoSettings, socialLinks, searchKeywords,
  showcaseCategories, showcaseProducts, showcaseTranslations, operationLogs, gdprConsents,
} from '@/drizzle/schema';
import { ok, fail, logOperation, withAuth } from '@/lib/api-helpers';
import { uploadFile, listFiles, isR2Configured } from '@/lib/r2';

export const runtime = 'nodejs';

const BACKUP_PREFIX = 'backups/';

// GET：备份状态（07 §3.7）
export const GET = withAuth(async () => {

  const r2Configured = isR2Configured();

  // 数据规模参考（行数统计）
  const counts = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM products)::int AS products,
      (SELECT count(*) FROM inquiries)::int AS inquiries,
      (SELECT count(*) FROM sample_requests)::int AS samples
  `);
  const rows = (counts as unknown as { rows: Array<Record<string, number>> }).rows;

  // R2 备份文件列表（凭据未配置时为空）
  let backups: Array<{ filename: string; size: number; uploadedAt: Date | null }> = [];
  if (r2Configured) {
    try {
      const files = await listFiles(BACKUP_PREFIX);
      backups = files
        .filter((f) => f.key.endsWith('.json'))
        .map((f) => ({ filename: f.key.slice(BACKUP_PREFIX.length), size: f.size, uploadedAt: f.uploadedAt }))
        .sort((a, b) => b.filename.localeCompare(a.filename));
    } catch {
      backups = [];
    }
  }

  return ok({
    autoBackup: {
      enabled: true,
      schedule: '每天 03:00（上海时间，Workers Cron）',
      retentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 7),
    },
    neonPitr: '6 小时时间点恢复（Neon 自带）',
    r2Configured,
    lastBackup: backups[0] ?? null,
    backups,
    tableCounts: rows?.[0] ?? null,
  });
}, ['admin']);

// POST：手动触发备份（导出主要表 → JSON → 上传 R2）
export const POST = withAuth(async (_req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  if (!isR2Configured()) {
    // 凭据未配置：明确告知演练模式（保持向后兼容）
    await logOperation(auth, 'backup', 'database', undefined, 'dev-mock（R2 未配置）');
    return ok({ success: true, mock: true, message: '演练模式：R2 凭据未配置，备份逻辑已演练，未产生文件' });
  }

  // 导出主要表（排除 productViewLogs 大量日志与 showcaseAccessTokens 临时令牌）
  const [
    productRows, translationRows, categoryRows, imageRows, videoRows, layoutRows, recommendationRows,
    inquiryRows, inquiryItemRows, chatRows, sampleRows, reviewRows, reviewImageRows, userRows, uploadRows,
    homepageRows, heroRows, sellingRows, certRows, ctaRows, navRows, pageRows, siteRows, seoRows,
    socialRows, keywordRows, showcaseCatRows, showcaseProdRows, showcaseTransRows, logRows, gdprRows,
  ] = await Promise.all([
    db.select().from(products),
    db.select().from(productTranslations),
    db.select().from(categories),
    db.select().from(productImages),
    db.select().from(productVideos),
    db.select().from(productPageLayouts),
    db.select().from(recommendations),
    db.select().from(inquiries),
    db.select().from(inquiryItems),
    db.select().from(chatMessages),
    db.select().from(sampleRequests),
    db.select().from(reviews),
    db.select().from(reviewImages),
    db.select().from(users),
    db.select().from(uploads),
    db.select().from(homepageConfig),
    db.select().from(heroImages),
    db.select().from(sellingPoints),
    db.select().from(certifications),
    db.select().from(ctaButtons),
    db.select().from(navigationItems),
    db.select().from(pageContents),
    db.select().from(siteConfig),
    db.select().from(seoSettings),
    db.select().from(socialLinks),
    db.select().from(searchKeywords),
    db.select().from(showcaseCategories),
    db.select().from(showcaseProducts),
    db.select().from(showcaseTranslations),
    db.select().from(operationLogs),
    db.select().from(gdprConsents),
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    version: '1.0',
    tables: {
      products: productRows,
      product_translations: translationRows,
      categories: categoryRows,
      product_images: imageRows,
      product_videos: videoRows,
      product_page_layouts: layoutRows,
      recommendations: recommendationRows,
      inquiries: inquiryRows,
      inquiry_items: inquiryItemRows,
      chat_messages: chatRows,
      sample_requests: sampleRows,
      reviews: reviewRows,
      review_images: reviewImageRows,
      // 安全：备份不带密码哈希
      users: userRows.map(({ password, ...rest }) => rest),
      uploads: uploadRows,
      homepage_config: homepageRows,
      hero_images: heroRows,
      selling_points: sellingRows,
      certifications: certRows,
      cta_buttons: ctaRows,
      navigation_items: navRows,
      page_contents: pageRows,
      site_config: siteRows,
      seo_settings: seoRows,
      social_links: socialRows,
      search_keywords: keywordRows,
      showcase_categories: showcaseCatRows,
      showcase_products: showcaseProdRows,
      showcase_translations: showcaseTransRows,
      operation_logs: logRows,
      gdpr_consents: gdprRows,
    },
  };

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const json = JSON.stringify(payload);
  try {
    await uploadFile(
      `${BACKUP_PREFIX}${filename}`,
      new TextEncoder().encode(json).buffer as ArrayBuffer,
      'application/json'
    );
  } catch {
    return fail('备份上传 R2 失败，请检查凭据与网络', 500);
  }

  await logOperation(auth, 'backup', 'database', filename, `备份 ${Math.round(json.length / 1024)}KB`);
  return ok({ success: true, filename, sizeBytes: json.length });
}, ['admin']);
