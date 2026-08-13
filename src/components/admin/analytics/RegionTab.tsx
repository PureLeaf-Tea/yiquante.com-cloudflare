'use client';

// 分析地域标签页（R2 拆分自 AnalyticsAdmin.tsx：国家排名 + 国家×产品热度矩阵，纯展示）
import type { CountryRow } from './analyticsTypes';

export interface RegionMatrix {
  topCountries: string[];
  topProdIds: string[];
  productNames: Map<string, string>;
  count: Map<string, number>;
  max: number;
}

export function RegionTab({ countries, matrix }: { countries: CountryRow[]; matrix: RegionMatrix }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">国家浏览排名</h2>
        {countries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="py-2">排名</th>
                <th className="py-2">国家</th>
                <th className="py-2 text-right">浏览量</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c, i) => (
                <tr key={c.country || 'unknown'} className="border-b border-gray-50 last:border-b-0">
                  <td className="py-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 text-gray-700">{c.country || '未知'}</td>
                  <td className="py-2 text-right font-medium text-brand-green">{c.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">国家 × 产品热度矩阵</h2>
        {matrix.topCountries.length === 0 || matrix.topProdIds.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
        ) : (
          <table className="w-full min-w-[420px] text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="p-2">国家\产品</th>
                {matrix.topProdIds.map((pid) => (
                  <th key={pid} className="max-w-20 truncate p-2" title={matrix.productNames.get(pid)}>
                    {matrix.productNames.get(pid) || '产品'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.topCountries.map((c) => (
                <tr key={c}>
                  <td className="p-2 font-medium text-gray-700">{c}</td>
                  {matrix.topProdIds.map((pid) => {
                    const v = matrix.count.get(`${c}|${pid}`) || 0;
                    const alpha = v === 0 ? 0 : 0.15 + 0.85 * (v / matrix.max);
                    return (
                      <td key={pid} className="p-1 text-center">
                        <span
                          className="inline-block w-full rounded px-2 py-1.5 text-gray-700"
                          style={{ backgroundColor: v === 0 ? '#f7f7f7' : `rgba(26, 58, 26, ${alpha})`, color: alpha > 0.6 ? '#fff' : undefined }}
                        >
                          {v || ''}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
