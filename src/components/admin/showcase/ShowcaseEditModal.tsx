'use client';

// B2B 展示区新增/编辑弹窗（R2 拆分自 ShowcaseAdmin.tsx，表单状态由父级持有）
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ShowcaseCat } from './ShowcaseCategoryTable';

export interface ShowcaseEditForm {
  nameZh: string;
  nameEn: string;
  slug: string;
  descriptionZh: string;
  descriptionEn: string;
  password: string;
}

export function ShowcaseEditModal({
  open,
  editing,
  form,
  saving,
  onField,
  onSave,
  onClose,
}: {
  open: boolean;
  editing: ShowcaseCat | null;
  form: ShowcaseEditForm;
  saving: boolean;
  onField: (key: keyof ShowcaseEditForm, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? '编辑分类' : '新增 B2B 分类'}
      footer={
        <Button loading={saving} onClick={onSave}>
          {editing ? '保存修改' : '创建分类'}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="名称（中文）" required placeholder="如：自包装成品礼盒" value={form.nameZh} onChange={(e) => onField('nameZh', e.target.value)} />
        <Input label="名称（英文）" required placeholder="e.g. Self-Packaged Gift Boxes" value={form.nameEn} onChange={(e) => onField('nameEn', e.target.value)} />
        {!editing && (
          <div>
            <Input label="Slug" required placeholder="如：self-packaged-gift-boxes" value={form.slug} onChange={(e) => onField('slug', e.target.value)} />
            <p className="mt-1 text-xs text-gray-400">URL 标识，创建后不可修改</p>
          </div>
        )}
        <Input
          label={editing ? '新密码（留空不修改）' : '初始密码'}
          type="password"
          required={!editing}
          placeholder={editing ? '留空保持不变' : '设置初始访问密码'}
          value={form.password}
          onChange={(e) => onField('password', e.target.value)}
        />
        <Input label="描述（中文）" placeholder="选填" value={form.descriptionZh} onChange={(e) => onField('descriptionZh', e.target.value)} />
        <Input label="描述（英文）" placeholder="选填" value={form.descriptionEn} onChange={(e) => onField('descriptionEn', e.target.value)} />
      </div>
    </Modal>
  );
}
