'use client';

// 图片懒加载（useLazyLoad.ts）
// 基于 IntersectionObserver（浏览器原生 API：监测元素是否进入可视区域）
// 产品列表/B2B 列表的图片滚动到可见时才加载，首屏更快、省流量
import { useEffect, useRef, useState } from 'react';

// ★和老版的区别：实现完全一样（Intersection Observer）。
// 纯前端功能，不受架构变化影响。
export function useLazyLoad(options?: {
  rootMargin?: string; // 提前多少像素开始加载，默认 '200px'（快滚到时就预加载）
  threshold?: number; // 可见比例阈值，默认 0.01（露出 1% 即触发）
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // 加载一次后就断开观察（图片只加载一次）
        }
      },
      {
        rootMargin: options?.rootMargin || '200px',
        threshold: options?.threshold || 0.01,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options?.rootMargin, options?.threshold]);

  return { ref, isVisible };
}
