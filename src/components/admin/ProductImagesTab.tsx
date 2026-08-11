'use client';

// 产品图片标签页（ProductImagesTab.tsx）
// 现有图列表 + 上传追加（POST /api/products/[id]/images）+ 删除（DELETE ?imageId=）
import { useCallback, useEffect, useState } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export function ProductImagesTab({ productId }: { productId: string }) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = (await res.json()) as { success?: boolean; data?: { images?: ProductImage[] } };
      if (data.success && data.data) setImages(data.data.images || []);
    } catch {
      // 加载失败保持空列表
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`/api/products/${productId}/images`, { method: 'POST', body: form });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '上传失败');
        return;
      }
      toastSuccess('图片已添加');
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (imageId: string) => {
    if (!window.confirm('确定删除这张图片？')) return;
    const res = await fetch(`/api/products/${productId}/images?imageId=${imageId}`, { method: 'DELETE' });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toastError(data.error || '删除失败');
      return;
    }
    toastSuccess('图片已删除');
    await load();
  };

  return (
    <div className="space-y-4">
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-btn border border-dashed border-gray-300 px-4 text-sm text-gray-500 hover:border-brand-gold hover:text-brand-gold">
        <Upload size={15} aria-hidden="true" />
        {uploading ? '上传中...' : '上传图片（JPG/PNG/WebP，≤10MB）'}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} disabled={uploading} />
      </label>

      {loading ? (
        <p className="text-sm text-gray-400">加载中...</p>
      ) : images.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">
          <ImageIcon size={16} aria-hidden="true" />
          暂无图片
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt || ''} className="aspect-square w-full object-cover" />
              <button
                type="button"
                aria-label="删除图片"
                onClick={() => remove(img.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-700 group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
              <span className="absolute bottom-1 left-1.5 rounded bg-black/50 px-1.5 text-xs text-white">
                排序 {img.sortOrder}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
