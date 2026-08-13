'use client';

// 客户行为分析（AnalyticsAdmin.tsx）
// R2 拆分：图表 → analytics/AnalyticsCharts.tsx；三标签页 → analytics/{OverviewTab,RegionTab,ProductTab}.tsx；
// 类型 → analytics/analyticsTypes.ts。本组件保留数据加载与矩阵聚合。
// 地域/产品标签页点击才渲染，用 next/dynamic 代码分割；总览为默认标签不分割。
import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, Globe, Package } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { OverviewData, CountryRow, ProductRankRow, ViewLogRow } from './analytics/analyticsTypes';
import { OverviewTab } from './analytics/OverviewTab';

const RegionTab = dynamic(() => import('./analytics/RegionTab').then((m) => m.RegionTab), { ssr: false });
const ProductTab = dynamic(() => import('./analytics/ProductTab').then((m) => m.ProductTab), { ssr: false });

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

      {tab === 'overview' && <OverviewTab overview={overview} />}

      {tab === 'region' && <RegionTab countries={countries} matrix={matrix} />}

      {tab === 'product' && <ProductTab topProducts={topProducts} />}
    </div>
  );
}
