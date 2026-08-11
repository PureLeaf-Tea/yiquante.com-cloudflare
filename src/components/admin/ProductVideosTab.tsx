'use client';

// 产品视频标签页（ProductVideosTab.tsx）
// 视频列表 + 上传（multipart）+ 删除（现有 API）
import { useCallback, useEffect, useState } from 'react';
import { Upload, Trash2, Video as VideoIcon } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface ProductVideoItem {
  id: string;
  url: string;
  type: string;
  title: string | null;
}

export function ProductVideosTab({ productId }: { productId: string }) {
  const [videos, setVideos] = useState<ProductVideoItem[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('video');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = (await res.json()) as { success?: boolean; data?: { videos?: ProductVideoItem[] } };
      if (data.success && data.data) setVideos(data.data.videos || []);
    } catch {
      // 加载失败保持空列表
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async () => {
    if (!file) {
      toastError('请选择视频或 360° 素材文件');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      if (title.trim()) form.append('title', title.trim());
      const res = await fetch(`/api/products/${productId}/videos`, { method: 'POST', body: form });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '上传失败');
        return;
      }
      toastSuccess('视频已上传');
      setTitle('');
      setFile(null);
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (videoId: string) => {
    if (!window.confirm('确定删除该视频？')) return;
    const res = await fetch(`/api/products/${productId}/videos/${videoId}`, { method: 'DELETE' });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '删除失败');
      return;
    }
    toastSuccess('视频已删除');
    await load();
  };

  return (
    <div className="space-y-4">
      {/* 上传表单 */}
      <div className="space-y-3 rounded-lg bg-gray-50 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="视频标题" placeholder="如：冲泡演示" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select
            label="类型"
            options={[
              { value: 'video', label: '视频（MP4）' },
              { value: '360', label: '360° 展示素材' },
            ]}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-btn border border-dashed border-gray-300 px-4 text-sm text-gray-500 hover:border-brand-gold">
            <Upload size={15} aria-hidden="true" />
            {file ? file.name : '选择文件（≤500MB）'}
            <input type="file" accept="video/mp4,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <Button size="sm" loading={uploading} onClick={upload}>
            上传
          </Button>
        </div>
        <p className="text-xs text-gray-400">开发阶段上传登记占位 URL，R2 开通后替换真实存储。</p>
      </div>

      {/* 视频列表 */}
      {videos.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">
          <VideoIcon size={16} aria-hidden="true" />
          暂无视频/360° 素材
        </p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
              <VideoIcon size={16} className="shrink-0 text-brand-gold" aria-hidden="true" />
              <span className="flex-1 truncate text-sm text-gray-700">
                {v.title || '未命名'}
                <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{v.type === 'video' ? '视频' : '360°'}</span>
              </span>
              <button
                type="button"
                aria-label="删除视频"
                onClick={() => remove(v.id)}
                className="rounded p-1.5 text-gray-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
