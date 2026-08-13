'use client';

// 分析产品标签页（R2 拆分自 AnalyticsAdmin.tsx：TOP 20 热门产品排行，纯展示）
import { formatDuration } from './AnalyticsCharts';
import type { ProductRankRow } from './analyticsTypes';

export function ProductTab({ topProducts }: { topProducts: ProductRankRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">TOP 20 热门产品（近 30 天）</h2>
      {topProducts.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">暂无浏览数据</p>
      ) : (
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="py-2">排名</th>
              <th className="py-2">产品</th>
              <th className="py-2 text-right">浏览量</th>
              <th className="py-2 text-right">平均停留</th>
              <th className="py-2 text-right">涉及国家</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p, i) => (
              <tr key={p.productId} className="border-b border-gray-50 last:border-b-0">
                <td className="py-2.5 text-gray-400">{i + 1}</td>
                <td className="py-2.5 text-gray-700">{p.nameZh || p.nameEn || p.productId}</td>
                <td className="py-2.5 text-right font-medium text-brand-green">{p.views}</td>
                <td className="py-2.5 text-right text-gray-600">{formatDuration(p.avgDurationMs)}</td>
                <td className="py-2.5 text-right text-gray-600">{p.countries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
