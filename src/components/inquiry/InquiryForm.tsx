'use client';

// 询价表单（InquiryForm.tsx）
// 联系人信息 + 询价车商品清单（可删）→ POST /api/inquiries
// 开发阶段 hCaptcha 未配置密钥，API 侧自动跳过验证；上线前补验证码组件
import { useState } from 'react';
import { Send, Trash2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toastError } from '@/components/ui/Toast';
import { useInquiryCart } from '@/components/storefront/InquiryCartContext';

export function InquiryForm({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const { items, removeItem, clear } = useInquiryCart();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    country: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toastError(zh ? '姓名和邮箱为必填项' : 'Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: { id: string; chatToken?: string } };
      if (!res.ok || !data.success) {
        toastError(data.error || (zh ? '提交失败，请重试' : 'Submit failed, please retry'));
        return;
      }
      // 保存聊天凭证：前台聊天窗口凭此与客服沟通（ChatWidget 读取）
      try {
        localStorage.setItem('inquiry_chat_id', data.data?.chatToken || data.data?.id || '');
      } catch {
        // 存储失败不阻断
      }
      setSuccessId(data.data?.id ?? null);
      clear(); // 提交成功后清空询价车
    } catch {
      toastError(zh ? '网络错误，请重试' : 'Network error, please retry');
    } finally {
      setSubmitting(false);
    }
  };

  // 成功态：展示询价编号（后续聊天凭此进入客服会话）
  if (successId) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 size={44} className="mx-auto text-brand-green" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-brand-green">
          {zh ? '询价提交成功！' : 'Inquiry submitted!'}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {zh ? '询价编号：' : 'Inquiry ID: '}
          <span className="font-mono font-medium text-brand-green">{successId}</span>
        </p>
        <p className="mt-2 text-sm text-gray-400">
          {zh ? '我们会在 24 小时内回复您。' : 'We will get back to you within 24 hours.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 询价车商品清单 */}
      {items.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-brand-green">
            {zh ? `询价产品（${items.length}）` : `Products (${items.length})`}
          </h3>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <span className="flex-1 truncate text-sm text-gray-700">
                  {item.productName} × {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label={zh ? '移除' : 'Remove'}
                  onClick={() => removeItem(item.productId)}
                  className="rounded p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 联系人信息 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Input label={zh ? '姓名' : 'Name'} required placeholder={zh ? '请输入您的姓名' : 'Your name'} value={form.name} onChange={set('name')} />
        <Input label={zh ? '邮箱' : 'Email'} required type="email" placeholder="name@example.com" value={form.email} onChange={set('email')} />
        <Input label={zh ? '电话' : 'Phone'} placeholder="+86 ..." value={form.phone} onChange={set('phone')} />
        <Input label={zh ? '公司' : 'Company'} placeholder={zh ? '公司名称' : 'Company name'} value={form.company} onChange={set('company')} />
        <Input label={zh ? '国家' : 'Country'} placeholder={zh ? '如：匈牙利' : 'e.g. Hungary'} value={form.country} onChange={set('country')} />
      </div>

      {/* 留言 */}
      <div>
        <label htmlFor="inquiry-message" className="mb-1.5 block text-sm font-medium text-gray-700">
          {zh ? '留言' : 'Message'}
        </label>
        <textarea
          id="inquiry-message"
          rows={4}
          value={form.message}
          onChange={set('message')}
          placeholder={zh ? '想了解的产品、数量、其他需求...' : 'Products you are interested in, quantities, other requirements...'}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
        />
      </div>

      <Button icon={Send} loading={submitting} onClick={submit}>
        {zh ? '提交询价' : 'Send Inquiry'}
      </Button>
    </div>
  );
}
