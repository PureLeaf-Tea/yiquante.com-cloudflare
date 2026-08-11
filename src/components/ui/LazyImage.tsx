'use client';

// 懒加载图片组件（LazyImage.tsx）
// 基于 useLazyLoad Hook：图片滚动到接近可视区域（提前 200px）时才真正加载
// 未加载时显示 Skeleton 骨架占位，防止页面布局跳动
import Image from 'next/image';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { Skeleton } from './Skeleton';
import { cn } from '@/lib/cn';

export interface LazyImageProps {
  src: string;
  alt: string;
  // 显示宽度/高度（像素），用于占位和宽高比计算
  width?: number;
  height?: number;
  // 自定义容器类（如圆角、宽高比）
  className?: string;
  // img 对象填充方式（默认 cover）
  objectFit?: 'cover' | 'contain';
}

export function LazyImage({
  src,
  alt,
  width = 400,
  height = 400,
  className,
  objectFit = 'cover',
}: LazyImageProps) {
  // IntersectionObserver 监测容器是否进入视口
  const { ref, isVisible } = useLazyLoad();

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)} style={{ aspectRatio: `${width} / ${height}` }}>
      {isVisible ? (
        // 进入视口才渲染真实图片（fill 模式由容器尺寸决定显示大小）
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${width}px`}
          className={cn('transition-opacity duration-300', objectFit === 'cover' ? 'object-cover' : 'object-contain')}
        />
      ) : (
        // 未进入视口：骨架占位
        <Skeleton className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
