'use client';

// 分析总览标签页（R2 拆分自 AnalyticsAdmin.tsx：统计卡 + 趋势折线 + 来源饼图，纯展示）
import { Box, Eye, Timer, MapPin } from 'lucide-react';
import { LineChart, PieChart, formatDuration } from './AnalyticsCharts';
import type { OverviewData } from './analyticsTypes';

export function OverviewTab({ overview }: { overview: OverviewData | null }) {
  return (
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
  );
}
