'use client';

// 客户行为分析（AnalyticsAdmin.tsx）
// 三标签页：总览（统计卡+每日趋势折线+来源饼图）/ 地域（国家排名+热度矩阵）/ 产品（TOP20）
// 图表为纯 SVG 实现，不引入图表依赖
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Globe, Package, Eye, Timer, MapPin, Box } from 'lucide-react';
import { cn } from '@/lib/cn';

interface OverviewData {
  days: number;
  totalViews: number;
  uniqueCountries: number;
  uniqueProducts: number;
  avgDurationMs: number;
  daily: Array<{ date: string; views: number }>;
  sourceCounts: Array<{ source: string; views: number }>;
}

interface CountryRow {
  country: string | null;
  views: number;
}

interface ProductRankRow {
  productId: string;
  nameZh: string | null;
  nameEn: string | null;
  views: number;
  avgDurationMs: number;
  countries: number;
}

interface ViewLogRow {
  productId: string;
  country: string | null;
  source: string;
}

const PIE_COLORS = ['#1a3a1a', '#c9aa7b', '#3d5c3d', '#8a7355', '#6b8f6b'];

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} 秒`;
  return `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
}

// SVG 折线图（每日趋势）
function LineChart({ points }: { points: Array<{ date: string; views: number }> }) {
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">暂无浏览数据</p>;
  }
  const w = 720;
  const h = 220;
  const pad = { l: 40, r: 12, t: 16, b: 28 };
  const max = Math.max(...points.map((p) => p.views), 1);
  const x = (i: number) => pad.l + (points.length === 1 ? (w - pad.l - pad.r) / 2 : (i * (w - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.views)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="每日浏览趋势折线图">
      {/* 网格线 + Y 轴刻度 */}
      {[0, 0.5, 1].map((r) => (
        <g key={r}>
          <line x1={pad.l} x2={w - pad.r} y1={y(max * r)} y2={y(max * r)} stroke="#eee" strokeWidth={1} />
          <text x={pad.l - 6} y={y(max * r) + 4} textAnchor="end" fontSize={11} fill="#999">
            {Math.round(max * r)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#1a3a1a" strokeWidth={2.5} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.views)} r={3} fill="#c9aa7b" />
      ))}
      {/* X 轴日期（最多 7 个标签） */}
      {points.map((p, i) =>
        i % Math.ceil(points.length / 7) === 0 ? (
          <text key={p.date} x={x(i)} y={h - 8} textAnchor="middle" fontSize={10} fill="#999">
            {p.date.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

// SVG 饼图（来源分布）
function PieChart({ slices }: { slices: Array<{ source: string; views: number }> }) {
  const total = slices.reduce((s, x) => s + x.views, 0);
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">暂无来源数据</p>;
  }
  const cx = 90;
  const cy = 90;
  const r = 80;
  let acc = 0;
  const paths = slices.map((slice, i) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += slice.views;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    // 单一来源时画整圆
    if (slices.length === 1) {
      return <circle key={slice.source} cx={cx} cy={cy} r={r} fill={PIE_COLORS[i % PIE_COLORS.length]} />;
    }
    return (
      <path
        key={slice.source}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
        fill={PIE_COLORS[i % PIE_COLORS.length]}
      />
    );
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label="来源分布饼图">
        {paths}
      </svg>
      <ul className="space-y-2 text-sm">
        {slices.map((s, i) => (
          <li key={s.source} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} aria-hidden="true" />
            <span className="text-gray-600">{s.source === 'showcase' ? 'B2B 展示区' : '官网前台'}</span>
            <span className="text-gray-400">
              {s.views}（{Math.round((s.views / total) * 100)}%）
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyticsAdmin() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [topProducts, setTopProducts] = useState<ProductRankRow[]>([]);
  const [logs, setLogs] = useState<ViewLogRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [ovRes, coRes, pvRes, logRes] = await Promise.all([
        fetch('/api/analytics/overview?days=30'),
        fetch('/api/analytics/countries?days=30'),
        fetch('/api/analytics/views?days=30&limit=20'),
        fetch('/api/analytics/view-log?pageSize=500'),
      ]);
      const ov = (await ovRes.json()) as { success?: boolean; data?: OverviewData };
      const co = (await coRes.json()) as { success?: boolean; data?: CountryRow[] };
      const pv = (await pvRes.json()) as { success?: boolean; data?: ProductRankRow[] };
      const lg = (await logRes.json()) as { success?: boolean; data?: ViewLogRow[] };
      if (ov.success && ov.data) setOverview(ov.data);
      if (co.success && co.data) setCountries(co.data);
      if (pv.success && pv.data) setTopProducts(pv.data);
      if (lg.success && lg.data) setLogs(lg.data);
    } catch {
      // 加载失败保持空态
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 国家 × 产品热度矩阵（客户端聚合 view-log）
  const matrix = useMemo(() => {
    const count = new Map<string, number>();
    const countrySet = new Map<string, number>();
    const productNames = new Map<string, string>();
    for (const log of logs) {
      const c = log.country || '未知';
      const key = `${c}|${log.productId}`;
      count.set(key, (count.get(key) || 0) + 1);
      countrySet.set(c, (countrySet.get(c) || 0) + 1);
    }
    for (const p of topProducts) {
      productNames.set(p.productId, p.nameZh || p.nameEn || '产品');
    }
    // 取浏览最多的前 5 个国家与前 6 个产品
    const topCountries = [...countrySet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    const topProdIds = topProducts.slice(0, 6).map((p) => p.productId);
    const max = Math.max(...[...count.values()], 1);
    return { topCountries, topProdIds, productNames, count, max };
  }, [logs, topProducts]);

  const TABS = [
    { key: 'overview', label: '总览', icon: BarChart3 },
    { key: 'region', label: '地域', icon: Globe },
    { key: 'product', label: '产品', icon: Package },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">客户行为分析</h1>

      {/* 标签页导航 */}
      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm transition-colors',
                tab === t.key ? 'border-b-2 border-brand-green font-medium text-brand-green' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={15} aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ---------- 总览 ---------- */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: Eye, label: '总浏览量', value: overview?.totalViews ?? '—' },
              { icon: Box, label: '被浏览产品数', value: overview?.uniqueProducts ?? '—' },
              { icon: MapPin, label: '覆盖国家数', value: overview?.uniqueCountries ?? '—' },
              { icon: Timer, label: '平均停留时长', value: overview ? formatDuration(overview.avgDurationMs) : '—' },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{c.label}</p>
                    <p className="text-lg font-bold text-brand-green">{c.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">近 30 天每日浏览趋势</h2>
            <LineChart points={overview?.daily ?? []} />
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">流量来源分布</h2>
            <PieChart slices={overview?.sourceCounts ?? []} />
          </div>
        </div>
      )}

      {/* ---------- 地域 ---------- */}
      {tab === 'region' && (
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
      )}

      {/* ---------- 产品 ---------- */}
      {tab === 'product' && (
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
      )}
    </div>
  );
}
