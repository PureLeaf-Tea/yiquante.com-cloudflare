'use client';

// 分析图表（R2 拆分自 AnalyticsAdmin.tsx：纯 SVG 实现，不引入图表依赖）

export const PIE_COLORS = ['#1a3a1a', '#c9aa7b', '#3d5c3d', '#8a7355', '#6b8f6b'];

export function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} 秒`;
  return `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
}

// SVG 折线图（每日趋势）
export function LineChart({ points }: { points: Array<{ date: string; views: number }> }) {
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
export function PieChart({ slices }: { slices: Array<{ source: string; views: number }> }) {
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
