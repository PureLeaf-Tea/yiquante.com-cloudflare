'use client';

// 视频 / 360° 展示区块（ProductVideo.tsx，06 号文档 §5.3）
// 视频：video.js 播放器（支持全屏/倍速）；360°：连续角度图拖拽切换
// 仅在资源存在时渲染（由页面层控制）
import { useRef, useState } from 'react';
import { VideoPlayer } from '@videojs-player/react';
import 'video.js/dist/video-js.css';

export interface ProductVideoData {
  url: string;
  type: string; // 'video' | '360'
  title: string | null;
  thumbnail: string | null;
}

// 视频播放（video.js）
function VideoBlock({ video }: { video: ProductVideoData }) {
  return (
    <div className="overflow-hidden rounded-xl">
      <VideoPlayer
        src={video.url}
        poster={video.thumbnail || undefined}
        controls
        className="video-js vjs-big-play-centered aspect-video w-full"
      />
    </div>
  );
}

// 360° 查看器：24-36 张连续角度图，指针拖拽切换帧
// 素材为多张图（逗号分隔的 url 列表或单张占位）
function PanoramaBlock({ video }: { video: ProductVideoData }) {
  // 360° 素材：多帧 url 以逗号分隔存储；单张时退化为静态展示
  const frames = video.url.split(',').filter(Boolean);
  const [frame, setFrame] = useState(0);
  const dragging = useRef<{ startX: number; startFrame: number } | null>(null);

  if (frames.length <= 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={frames[0]} alt={video.title || '360°'} className="w-full rounded-xl object-cover" />
    );
  }

  return (
    <div
      className="relative cursor-grab select-none overflow-hidden rounded-xl active:cursor-grabbing"
      onPointerDown={(e) => {
        dragging.current = { startX: e.clientX, startFrame: frame };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        // 每拖动 20px 切换一帧
        const delta = Math.round((e.clientX - dragging.current.startX) / 20);
        const next = (dragging.current.startFrame + delta + frames.length) % frames.length;
        setFrame(next);
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frames[frame]} alt={video.title || `360° ${frame + 1}`} className="w-full rounded-xl object-cover" draggable={false} />
      <span className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
        {frame + 1} / {frames.length}
      </span>
    </div>
  );
}

export function ProductVideo({ videos }: { videos: ProductVideoData[] }) {
  if (videos.length === 0) return null;

  return (
    <div className="space-y-6">
      {videos.map((v) => (
        <div key={v.url}>
          {v.title && <h3 className="mb-2 text-base font-semibold text-brand-green">{v.title}</h3>}
          {v.type === 'video' ? <VideoBlock video={v} /> : <PanoramaBlock video={v} />}
        </div>
      ))}
    </div>
  );
}
