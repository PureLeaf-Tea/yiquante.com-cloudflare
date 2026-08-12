// locale 级未知路径兜底：/zh/nonexistent 等未匹配路径 → 渲染 [locale]/not-found.tsx
// （Next.js 默认把完全未匹配的 URL 交给根级 404，此 catch-all 将其拉回 locale 级 404）
import { notFound } from 'next/navigation';

export default function CatchAllNotFound() {
  notFound();
}
