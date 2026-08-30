// 订单不存在友好提示页（OrderMissing.tsx，订单模块第 3 期，需求文档 §4.1）
// /o/[orderNo] 在 [locale] 体系外，没有可用 locale，固定中英双语展示
import { Leaf } from 'lucide-react';

export function OrderMissing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfbf7] px-6 text-center text-[#1a3a1a]">
      <Leaf size={40} className="text-[#c9aa7b]" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold">订单不存在或链接有误</h1>
      <p className="mt-1 text-sm opacity-80">Order not found or the link is invalid.</p>
      <p className="mt-4 max-w-sm text-sm opacity-70">
        请核对链接后重试，或联系您的专属客服。
        <br />
        Please double-check the link, or contact us for help.
      </p>
      <p className="mt-8 font-serif text-sm opacity-60">YiQuanTea · 懿泉茶业</p>
    </div>
  );
}
