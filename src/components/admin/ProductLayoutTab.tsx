'use client';

// 产品布局标签页（ProductLayoutTab.tsx，07 §3.3）
// 7 区块 @dnd-kit 拖拽排序 + 保存（PUT /api/products/[id]/layout）
// 不在列表中的区块视为隐藏（不写入 layoutJson）
import { useCallback, useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

// 7 种区块类型（06 §5.2）
const BLOCK_DEFS: Array<{ key: string; label: string }> = [
  { key: 'gallery', label: '图片轮播（imageGallery）' },
  { key: 'productInfo', label: '产品信息（名称/价格/按钮）' },
  { key: 'description', label: '产品描述' },
  { key: 'brewingGuide', label: '冲泡指南' },
  { key: 'video', label: '视频/360° 展示' },
  { key: 'specs', label: '规格参数' },
  { key: 'recommended', label: '推荐产品' },
];

// 兼容种子/文档两种命名归一化
function normalize(key: string): string {
  const map: Record<string, string> = {
    imageGallery: 'gallery',
    gallery: 'gallery',
    info: 'productInfo',
    productInfo: 'productInfo',
    description: 'description',
    brewing: 'brewingGuide',
    brewingGuide: 'brewingGuide',
    video: 'video',
    videos: 'video',
    specs: 'specs',
    recommended: 'recommended',
    recommendations: 'recommended',
  };
  return map[key] || key;
}

function SortableBlock({ blockKey, label, visible, onToggle }: { blockKey: string; label: string; visible: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: blockKey });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        'flex items-center gap-2 rounded-lg border bg-white p-3 ' +
        (visible ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-50')
      }
    >
      <span className="cursor-grab text-gray-400" {...attributes} {...listeners}>
        <GripVertical size={16} aria-hidden="true" />
      </span>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <Switch checked={visible} onChange={onToggle} label="显示" />
    </div>
  );
}

export function ProductLayoutTab({ productId }: { productId: string }) {
  // order：区块显示顺序；hidden：被隐藏的区块集合
  const [order, setOrder] = useState<string[]>(BLOCK_DEFS.map((b) => b.key));
  const [hidden, setHidden] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // 读取现有布局
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/layout`);
      const data = (await res.json()) as { success?: boolean; data?: { layoutJson?: string | null } };
      const raw = data.success ? data.data?.layoutJson : null;
      if (!raw) return; // 无布局 → 保持默认 7 区块顺序
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((k) => normalize(String(k))).filter((k) => BLOCK_DEFS.some((b) => b.key === k));
          // 已保存的区块按保存顺序；未出现的（新增区块）追加到末尾并视为隐藏
          const missing = BLOCK_DEFS.map((b) => b.key).filter((k) => !normalized.includes(k));
          setOrder([...normalized, ...missing]);
          setHidden(missing);
        }
      } catch {
        // JSON 损坏保持默认
      }
    } catch {
      // 网络错误保持默认
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((items) => arrayMove(items, items.indexOf(String(active.id)), items.indexOf(String(over.id))));
    }
  };

  const toggleBlock = (key: string) => {
    setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]));
  };

  const save = async () => {
    setSaving(true);
    try {
      const layout = order.filter((k) => !hidden.includes(k));
      const res = await fetch(`/api/products/${productId}/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutJson: JSON.stringify(layout) }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess('布局已保存');
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">拖拽调整区块顺序；关闭开关即在前台隐藏该区块。</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((key) => {
              const def = BLOCK_DEFS.find((b) => b.key === key);
              if (!def) return null;
              return (
                <SortableBlock
                  key={key}
                  blockKey={key}
                  label={def.label}
                  visible={!hidden.includes(key)}
                  onToggle={() => toggleBlock(key)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <Button size="sm" icon={Save} loading={saving} onClick={save}>
        保存布局
      </Button>
    </div>
  );
}
