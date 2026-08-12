'use client';

// 网站设置（SettingsAdmin.tsx）
// 品牌设置（名称/Logo/主色/字体）+ 联系信息 + 功能开关；整表 PUT config/site
import { useCallback, useEffect, useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface SiteForm {
  brandNameZh: string;
  brandNameEn: string;
  sloganZh: string;
  sloganEn: string;
  brandColorPrimary: string;
  brandColorSecondary: string;
  logoUrl: string;
  fontFamily: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  wechat: string;
  addressZh: string;
  addressEn: string;
  gdprEnabled: boolean;
  hcaptchaEnabled: boolean;
  multiLanguageEnabled: boolean;
}

const EMPTY: SiteForm = {
  brandNameZh: '',
  brandNameEn: '',
  sloganZh: '',
  sloganEn: '',
  brandColorPrimary: '#1a3a1a',
  brandColorSecondary: '#c9aa7b',
  logoUrl: '',
  fontFamily: 'serif',
  contactEmail: '',
  contactPhone: '',
  whatsapp: '',
  wechat: '',
  addressZh: '',
  addressEn: '',
  gdprEnabled: true,
  hcaptchaEnabled: false,
  multiLanguageEnabled: true,
};

export function SettingsAdmin() {
  const [form, setForm] = useState<SiteForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/config/site');
      const data = (await res.json()) as { success?: boolean; data?: Partial<SiteForm> | null };
      if (data.success && data.data) {
        setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(data.data).filter(([, v]) => v !== null && v !== undefined)) });
      }
    } catch {
      // 加载失败用默认值
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof SiteForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Logo 上传（/api/upload → 占位 URL）
  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: { url: string } };
      if (!res.ok || !data.success || !data.data) {
        toastError(data.error || '上传失败');
        return;
      }
      setForm((f) => ({ ...f, logoUrl: data.data!.url }));
      toastSuccess('Logo 已上传');
    } catch {
      toastError('网络错误');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '保存失败');
        return;
      }
      toastSuccess('网站设置已保存');
    } catch {
      toastError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">网站设置</h1>
        <Button icon={Save} loading={saving} onClick={save}>
          保存
        </Button>
      </div>

      {/* 品牌设置 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">品牌设置</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="品牌名（中文）" placeholder="懿泉茶业" value={form.brandNameZh} onChange={set('brandNameZh')} />
          <Input label="品牌名（英文）" placeholder="YiQuanTea" value={form.brandNameEn} onChange={set('brandNameEn')} />
          <Input label="标语（中文）" placeholder="自然之味 · 嵩山" value={form.sloganZh} onChange={set('sloganZh')} />
          <Input label="标语（英文）" placeholder="Whole Leaf · Pure Nature" value={form.sloganEn} onChange={set('sloganEn')} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">品牌主色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="品牌主色选择"
                value={form.brandColorPrimary}
                onChange={(e) => setForm((f) => ({ ...f, brandColorPrimary: e.target.value }))}
                className="h-10 w-12 cursor-pointer rounded border border-gray-300"
              />
              <input
                type="text"
                aria-label="品牌主色值"
                value={form.brandColorPrimary}
                onChange={set('brandColorPrimary')}
                className="min-h-10 w-28 rounded-btn border border-gray-300 px-3 font-mono text-sm outline-none focus:border-brand-green"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">品牌辅色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="品牌辅色选择"
                value={form.brandColorSecondary}
                onChange={(e) => setForm((f) => ({ ...f, brandColorSecondary: e.target.value }))}
                className="h-10 w-12 cursor-pointer rounded border border-gray-300"
              />
              <input
                type="text"
                aria-label="品牌辅色值"
                value={form.brandColorSecondary}
                onChange={set('brandColorSecondary')}
                className="min-h-10 w-28 rounded-btn border border-gray-300 px-3 font-mono text-sm outline-none focus:border-brand-green"
              />
            </div>
          </div>
          <Select
            label="品牌字体"
            options={[
              { value: 'serif', label: '衬线体（典雅，推荐）' },
              { value: 'sans', label: '无衬线体（现代）' },
            ]}
            value={form.fontFamily}
            onChange={(e) => setForm((f) => ({ ...f, fontFamily: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Logo</label>
            <div className="flex items-center gap-3">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="Logo 预览" className="h-10 w-16 rounded object-cover" />
              ) : (
                <div className="flex h-10 w-16 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">未设置</div>
              )}
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-btn border border-dashed border-gray-300 px-4 text-sm text-gray-500 hover:border-brand-gold hover:text-brand-gold">
                <Upload size={14} aria-hidden="true" />
                上传 Logo
                <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={uploadLogo} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 联系信息 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">联系信息</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="邮箱" type="email" placeholder="yqtea.cn@gmail.com" value={form.contactEmail} onChange={set('contactEmail')} />
          <Input label="电话" placeholder="+86 15515928905" value={form.contactPhone} onChange={set('contactPhone')} />
          <Input label="WhatsApp" placeholder="+86 13333827003" value={form.whatsapp} onChange={set('whatsapp')} />
          <Input label="微信号" placeholder="ZenSongshanTea" value={form.wechat} onChange={set('wechat')} />
          <Input label="地址（中文）" placeholder="中岳嵩山" value={form.addressZh} onChange={set('addressZh')} />
          <Input label="地址（英文）" placeholder="Mount Song, China" value={form.addressEn} onChange={set('addressEn')} />
        </div>
      </div>

      {/* 功能开关 */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">功能开关</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm text-gray-600">GDPR Cookie 同意弹窗</span>
            <Switch checked={form.gdprEnabled} onChange={() => setForm((f) => ({ ...f, gdprEnabled: !f.gdprEnabled }))} label="GDPR 开关" />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm text-gray-600">hCaptcha 人机验证</span>
            <Switch checked={form.hcaptchaEnabled} onChange={() => setForm((f) => ({ ...f, hcaptchaEnabled: !f.hcaptchaEnabled }))} label="hCaptcha 开关" />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm text-gray-600">多语言（6 语言切换）</span>
            <Switch checked={form.multiLanguageEnabled} onChange={() => setForm((f) => ({ ...f, multiLanguageEnabled: !f.multiLanguageEnabled }))} label="多语言开关" />
          </div>
        </div>
      </div>
    </div>
  );
}
