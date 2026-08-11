// 骨架屏组件（Skeleton.tsx）
// 数据加载中的占位动画（animate-pulse 灰色闪烁块），避免页面"跳动"和白屏感
// 三种形态：line（文字行）/ card（产品卡片）/ circle（头像或圆图）
import { cn } from '@/lib/cn';

export interface SkeletonProps {
  // 占位形态：line 行 / card 卡片 / circle 圆形
  shape?: 'line' | 'card' | 'circle';
  className?: string;
}

export function Skeleton({ shape = 'line', className }: SkeletonProps) {
  if (shape === 'circle') {
    return <div className={cn('animate-pulse rounded-full bg-gray-200 w-12 h-12', className)} />;
  }
  if (shape === 'card') {
    return (
      // 卡片骨架：上图 + 两行文字占位
      <div className={cn('animate-pulse rounded-xl bg-white border border-gray-100 overflow-hidden', className)}>
        <div className="aspect-square bg-gray-200" />
        <div className="space-y-2 p-4">
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-200" />
        </div>
      </div>
    );
  }
  // line：单行占位
  return <div className={cn('animate-pulse rounded bg-gray-200 h-4 w-full', className)} />;
}
