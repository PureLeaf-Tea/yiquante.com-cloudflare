'use client';

// 图片上传组件（ImageUpload.tsx）
// 点击选图 + 缩略图预览 + 文件校验：类型白名单（jpg/png/webp）+ 大小 ≤10MB
// 开发阶段存本地预览（URL.createObjectURL），阶段 8 上传接口接入后改为 R2 URL
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './Button';
import { toastError } from './Toast';
import { formatFileSize } from '@/lib/utils';

// 允许的图片类型白名单（上传安全规范：限制类型防恶意文件）
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// 大小上限 10MB（与 next.config.mjs 的 serverActions.bodySizeLimit 对齐）
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface ImageUploadProps {
  // 选中合法图片后的回调（返回 File 对象，供后续上传）
  onSelect: (file: File, previewUrl: string) => void;
  // 按钮文字（默认"上传图片"）
  buttonText?: string;
  // 已选图片的预览 URL（受控显示）
  previewUrl?: string;
  // 移除图片回调（点预览图上的叉）
  onRemove?: () => void;
}

export function ImageUpload({ onSelect, buttonText = '上传图片', previewUrl, onRemove }: ImageUploadProps) {
  // 隐藏的 file input 引用
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const shownPreview = previewUrl ?? localPreview;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空 input 值，允许重复选择同一个文件
    e.target.value = '';
    if (!file) return;

    // 类型校验
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toastError('仅支持 JPG / PNG / WebP 格式的图片');
      return;
    }
    // 大小校验
    if (file.size > MAX_SIZE_BYTES) {
      toastError(`图片不能超过 10MB（当前 ${formatFileSize(file.size)}）`);
      return;
    }

    // URL.createObjectURL：把本地文件生成临时预览地址（仅浏览器内存，不上传）
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    onSelect(file, url);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleChange}
      />

      {shownPreview ? (
        // 预览态：缩略图 + 移除按钮
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shownPreview}
            alt="已选图片预览"
            className="h-32 w-32 rounded-lg border border-gray-200 object-cover"
          />
          {onRemove && (
            <button
              type="button"
              aria-label="移除图片"
              onClick={() => {
                setLocalPreview(null);
                onRemove();
              }}
              className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        // 未选图：上传按钮（图标 + 汉字规范）
        <Button type="button" variant="outline" icon={Upload} onClick={() => inputRef.current?.click()}>
          {buttonText}
        </Button>
      )}

      <p className="text-xs text-gray-500">支持 JPG / PNG / WebP，不超过 10MB</p>
    </div>
  );
}
