'use client';

// 社交媒体链接（SocialAdmin.tsx）
// 六平台固定列表：图标预览 + URL + 显隐开关；整表 PUT
import { useCallback, useEffect, useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, MessageCircle, MessagesSquare, Save } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface SocialRow {
  platform: string;
  labelZh: string | null;
  labelEn: string | null;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

const PLATFORMS: Array<{ key: string; label: string; icon: typeof Facebook }> = [
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'twitter', label: 'Twitter / X', icon: Twitter },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'wechat', label: 'WeChat 微信', icon: MessagesSquare },
];

export function SocialAdmin() {
  const [rows, setRows] = useState<Record<string, SocialRow>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/config/social');
      const data = (await res.json()) as { success?: boolean; data?: SocialRow[] };
      const map: Record<string, SocialRow> = {};
      if (data.success && data.data) {
        data.data.forEach((r) => {
          map[r.platform] = r;
        });
      }
      setRows(map);
    } catch {
      // 加载失败保持空
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setUrl = (platform: string, url: string) => {
    setRows((prev) => ({
      ...prev,
      [platform]: {
        platform,
        labelZh: prev[platform]?.labelZh ?? null,
        labelEn: prev[platform]?.labelEn ?? null,
        url,
        sortOrder: PLATFORMS.findIndex((p) => p.key === platform),
        isActive: prev[platform]?.isActive ?? false,
      },
    }));
  };

  const toggle = (platform: string) => {
    setRows((prev) => {
      const cur = prev[platform];
      return {
        ...prev,
        [platform]: {
          platform,
          labelZh: cur?.labelZh ?? null,
          labelEn: cur?.labelEn ?? null,
          url: cur?.url ?? '',
          sortOrder: PLATFORMS.findIndex((p) => p.key === platform),
          isActive: !(cur?.isActive ?? false),
        },
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // 只保存有 URL 的平台
      const items = PLATFORMS.filter((p) => (rows[p.key]?.url || '').trim()).map((p) => rows[p.key]);
      const res = await fetch('/api/config/social', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess('社交链接已保存');
      await load();
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">社交媒体链接</h1>
        <Button icon={Save} loading={saving} onClick={save}>
          保存
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const row = rows[p.key];
          const active = row?.isActive ?? false;
          return (
            <div key={p.key} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                <Icon size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700">{p.label}</p>
                <div className="mt-1">
                  <Input
                    placeholder={p.key === 'wechat' ? '微信号，如 ZenSongshanTea' : 'https://...'}
                    value={row?.url || ''}
                    onChange={(e) => setUrl(p.key, e.target.value)}
                  />
                </div>
              </div>
              <Switch checked={active} onChange={() => toggle(p.key)} label={`${p.label} 显示开关`} />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400">未填写链接的平台不会保存；页脚按「显示开关」渲染启用的平台。</p>
    </div>
  );
}
