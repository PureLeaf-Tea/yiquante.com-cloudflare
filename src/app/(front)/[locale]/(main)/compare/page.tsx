// 产品对比页（/[locale]/compare?ids=a,b,c）
// 最多 3 个产品并排对比（02 号文档）；空态提示
import Link from 'next/link';
import { Scale } from 'lucide-react';
import { getProductsByIds } from '@/lib/queries';

export default async function ComparePage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const locale = params.locale;
  const zh = locale === 'zh';

  const ids = (searchParams.ids || '').split(',').filter(Boolean).slice(0, 3);
  const items = await getProductsByIds(ids, locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 font-serif text-2xl text-brand-green md:text-3xl">
        <Scale className="text-brand-gold" aria-hidden="true" />
        {zh ? '产品对比' : 'Product Comparison'}
      </h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">
            {zh ? '尚未选择要对比的产品。去产品列表挑选 2-3 个产品吧。' : 'No products selected. Pick 2-3 products from the list.'}
          </p>
          <Link
            href={`/${locale}/products`}
            className="mt-4 inline-flex min-h-touch items-center rounded-btn bg-brand-green px-6 text-sm font-medium text-white hover:bg-brand-green/90"
          >
            {zh ? '浏览产品' : 'Browse Products'}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {/* 图片行 */}
              <tr className="border-b border-gray-100">
                {items.map((p) => (
                  <td key={p.id} className="w-1/3 p-4 text-center">
                    <Link href={`/${locale}/products/${p.slug}`}>
                      {p.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail} alt={zh ? p.nameZh : p.nameEn} className="mx-auto h-40 w-40 rounded-xl object-cover" />
                      ) : (
                        <div className="mx-auto h-40 w-40 rounded-xl bg-gray-100" />
                      )}
                    </Link>
                  </td>
                ))}
              </tr>
              {/* 名称行 */}
              <tr className="border-b border-gray-100">
                {items.map((p) => (
                  <td key={p.id} className="p-4 text-center font-medium text-brand-green">
                    <Link href={`/${locale}/products/${p.slug}`} className="hover:text-brand-gold">
                      {zh ? p.nameZh : p.nameEn}
                    </Link>
                  </td>
                ))}
              </tr>
              {/* 价格行 */}
              <tr className="border-b border-gray-100">
                {items.map((p) => (
                  <td key={p.id} className="p-4 text-center font-semibold text-brand-gold">
                    ¥{p.priceCNY} / ${p.priceUSD}
                  </td>
                ))}
              </tr>
              {/* 规格行 */}
              <tr className="border-b border-gray-100">
                {items.map((p) => (
                  <td key={p.id} className="p-4 text-center text-gray-600">
                    {p.spec || '—'}
                  </td>
                ))}
              </tr>
              {/* 描述行 */}
              <tr>
                {items.map((p) => (
                  <td key={p.id} className="p-4 align-top text-xs leading-relaxed text-gray-500">
                    {p.description || '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
