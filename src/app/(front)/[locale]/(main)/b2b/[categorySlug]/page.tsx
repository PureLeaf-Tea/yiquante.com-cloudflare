// B2B 分类产品列表页（/[locale]/b2b/[categorySlug]）
// 服务端取分类信息，客户端组件完成 token 校验 + 密码弹窗 + 产品拉取
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseCategories } from '@/drizzle/schema';
import { B2BCategoryProducts } from '@/components/b2b/B2BCategoryProducts';

export default async function B2BCategoryPage({
  params: paramsPromise,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
}) {
  const params = await paramsPromise;
  const rows = await db
    .select()
    .from(showcaseCategories)
    .where(eq(showcaseCategories.slug, params.categorySlug))
    .limit(1);
  const category = rows[0];
  // 分类不存在或停用 → 404
  if (!category || !category.isActive) notFound();

  return (
    <B2BCategoryProducts
      category={{ id: category.id, slug: category.slug, nameZh: category.nameZh, nameEn: category.nameEn }}
      locale={params.locale}
    />
  );
}
