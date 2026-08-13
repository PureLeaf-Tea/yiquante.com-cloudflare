'use client';

// 样品申请表单（SampleRequestForm.tsx，06 号文档 §7）
// 姓名*/邮箱*/电话/公司/国家下拉/地址*/产品选择/数量/留言
// hCaptcha 占位：密钥未配置时 API 侧自动跳过验证，上线前补组件
import { useEffect, useState } from 'react';
import { Send, CheckCircle2, Gift, Clock, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { HCaptchaBox } from '@/components/ui/HCaptchaBox';
import { toastError } from '@/components/ui/Toast';

// 常见国家下拉选项（其余可手填到留言）
const COUNTRIES = [
  ['CN', 'China'], ['HU', 'Hungary'], ['DE', 'Germany'], ['RU', 'Russia'],
  ['ES', 'Spain'], ['FR', 'France'], ['GB', 'United Kingdom'], ['US', 'United States'],
  ['AT', 'Austria'], ['CH', 'Switzerland'], ['BE', 'Belgium'], ['NL', 'Netherlands'],
  ['PL', 'Poland'], ['IT', 'Italy'], ['OTHER', 'Other'],
];

export function SampleRequestForm({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [products, setProducts] = useState<Array<{ id: string; nameZh: string; nameEn: string }>>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    country: '',
    address: '',
    productId: '',
    quantity: '1',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  // hCaptcha 验证 token（未通过时提交按钮置灰）
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // ★M5 修复：WhatsApp 联系号改读 site_config（后台可改），配置为空时回退原硬编码兜底值
  const [whatsapp, setWhatsapp] = useState('+86 13333827003');

  useEffect(() => {
    fetch('/api/config/site')
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { whatsapp?: string } }>)
      .then((d) => {
        if (d.success && d.data?.whatsapp) setWhatsapp(d.data.whatsapp);
      })
      .catch(() => {
        // 拉取失败保持兜底值
      });
  }, []);

  // 拉产品列表供选择（一次拉全，种子数据量小）
  useEffect(() => {
    fetch('/api/products?pageSize=100')
      .then((r) => r.json() as Promise<{ success?: boolean; data?: Array<{ id: string; nameZh: string; nameEn: string }> }>)
      .then((d) => {
        if (d.success && d.data) setProducts(d.data);
      })
      .catch(() => {
        // 拉取失败时产品选择留空，仍可提交
      });
  }, []);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.address.trim()) {
      toastError(zh ? '姓名、邮箱、收货地址为必填项' : 'Name, email and shipping address are required');
      return;
    }
    setSubmitting(true);
    try {
      const product = products.find((p) => p.id === form.productId);
      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          company: form.company || undefined,
          country: form.country || undefined,
          address: form.address,
          productId: form.productId || undefined,
          productName: product ? (zh ? product.nameZh : product.nameEn) : undefined,
          quantity: Math.max(1, Number(form.quantity) || 1),
          message: form.message || undefined,
          hcaptchaToken: captchaToken || undefined,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || (zh ? '提交失败，请重试' : 'Submit failed, please retry'));
        return;
      }
      setSuccess(true);
    } catch {
      toastError(zh ? '网络错误，请重试' : 'Network error, please retry');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 size={44} className="mx-auto text-brand-green" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-brand-green">
          {zh ? '样品申请已提交！' : 'Sample request submitted!'}
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {zh ? '我们会在 24 小时内回复您。' : 'We will get back to you within 24 hours.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label={zh ? '姓名' : 'Name'} required placeholder={zh ? '请输入您的姓名' : 'Your name'} value={form.name} onChange={set('name')} />
        <Input label={zh ? '邮箱' : 'Email'} required type="email" placeholder="name@example.com" value={form.email} onChange={set('email')} />
        <Input label={zh ? '电话' : 'Phone'} placeholder="+36 ..." value={form.phone} onChange={set('phone')} />
        <Input label={zh ? '公司' : 'Company'} placeholder={zh ? '公司名称' : 'Company name'} value={form.company} onChange={set('company')} />
        <Select
          label={zh ? '国家' : 'Country'}
          placeholder={zh ? '请选择国家' : 'Select country'}
          options={COUNTRIES.map(([value, label]) => ({ value, label }))}
          value={form.country}
          onChange={set('country')}
        />
        <Input label={zh ? '收货地址' : 'Shipping Address'} required placeholder={zh ? '详细收货地址' : 'Full shipping address'} value={form.address} onChange={set('address')} />
        <Select
          label={zh ? '感兴趣的产品' : 'Product of Interest'}
          placeholder={zh ? '请选择产品' : 'Select product'}
          options={products.map((p) => ({ value: p.id, label: zh ? p.nameZh : p.nameEn }))}
          value={form.productId}
          onChange={set('productId')}
        />
        <Input label={zh ? '申请数量' : 'Quantity'} type="number" min={1} value={form.quantity} onChange={set('quantity')} />
      </div>

      <div>
        <label htmlFor="sample-message" className="mb-1.5 block text-sm font-medium text-gray-700">
          {zh ? '留言' : 'Message'}
        </label>
        <textarea
          id="sample-message"
          rows={4}
          value={form.message}
          onChange={set('message')}
          placeholder={zh ? '其他需求说明...' : 'Other requirements...'}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
        />
      </div>

      {/* hCaptcha 人机验证（提交按钮上方） */}
      <HCaptchaBox locale={locale} onToken={setCaptchaToken} />

      <Button icon={Send} loading={submitting} disabled={!captchaToken} onClick={submit}>
        {zh ? '提交申请' : 'Submit Request'}
      </Button>

      {/* 底部提示（06 §7） */}
      <div className="grid gap-3 rounded-xl bg-brand-green/5 p-5 text-sm text-gray-600 md:grid-cols-3">
        <p className="flex items-center gap-2">
          <Gift size={16} className="shrink-0 text-brand-gold" aria-hidden="true" />
          {zh ? '样品免费，运费由买方承担' : 'Samples are free, shipping borne by buyer'}
        </p>
        <p className="flex items-center gap-2">
          <Clock size={16} className="shrink-0 text-brand-gold" aria-hidden="true" />
          {zh ? '我们会在 24 小时内回复' : 'We reply within 24 hours'}
        </p>
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-brand-green hover:text-brand-gold"
        >
          <MessageCircle size={16} className="shrink-0 text-brand-gold" aria-hidden="true" />
          WhatsApp: {whatsapp}
        </a>
      </div>
    </div>
  );
}
