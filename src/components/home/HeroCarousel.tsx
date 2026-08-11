'use client';

// Hero 轮播区（06 号文档 §3.1）
// 3-5 张图自动切换 5 秒；桌面 1920×800 比例、移动端 750×900 比例；即时加载（首屏不懒加载）
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface HeroSlide {
  imageUrl: string;
  title: string;
  subtitle: string;
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);

  // 自动切换：5 秒一张
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <section aria-label="首页轮播" className="relative w-full overflow-hidden bg-brand-green">
      {/* 移动端 750×900 比例，桌面端 1920×800 比例（06 §3.1） */}
      <div className="relative aspect-[750/900] w-full md:aspect-[1920/800] md:max-h-[800px]">
        {slides.map((slide, i) => (
          <div
            key={slide.imageUrl}
            className={cn(
              'absolute inset-0 transition-opacity duration-700',
              i === current ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden={i !== current}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="h-full w-full object-cover"
              loading="eager"
            />
            {/* 标题 + 标语叠加在图上 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 px-6 text-center">
              <h1 className="font-serif text-3xl text-white drop-shadow md:text-5xl">{slide.title}</h1>
              <p className="mt-3 text-base text-brand-gold drop-shadow md:text-xl">{slide.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 左右切换箭头（桌面显示） */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="上一张"
            onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 md:block"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="下一张"
            onClick={() => setCurrent((c) => (c + 1) % slides.length)}
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 md:block"
          >
            <ChevronRight size={22} />
          </button>
          {/* 底部指示点 */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 张`}
                onClick={() => setCurrent(i)}
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  i === current ? 'bg-brand-gold' : 'bg-white/50 hover:bg-white/80'
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
