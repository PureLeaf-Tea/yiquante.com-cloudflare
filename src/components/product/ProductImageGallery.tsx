'use client';

// 产品图片轮播（ProductImageGallery.tsx）
// 主图 + 缩略图切换 + 左右箭头
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface GalleryImage {
  url: string;
  alt: string | null;
}

export function ProductImageGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
        {productName}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 主图 */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-100 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[current].url}
          alt={images[current].alt || productName}
          className="h-full w-full object-cover"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="上一张"
              onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => setCurrent((c) => (c + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* 缩略图 */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setCurrent(i)}
              className={cn(
                'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2',
                i === current ? 'border-brand-gold' : 'border-transparent hover:border-gray-300'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt || `${productName} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
