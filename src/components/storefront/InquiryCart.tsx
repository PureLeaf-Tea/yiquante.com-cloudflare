'use client';

// 询价车浮动挂件（InquiryCart.tsx）
// 右下角悬浮：数量徽标 + 展开清单（删除/数量）+ 去提交询价
import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, X, Trash2, ArrowRight } from 'lucide-react';
import { useInquiryCart } from './InquiryCartContext';

export function InquiryCart({ locale }: { locale: string }) {
  const { items, removeItem, clear } = useInquiryCart();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3">
      {/* 展开清单 */}
      {open && (
        <div className="w-72 rounded-xl border border-gray-100 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-green">
              {locale === 'zh' ? '询价车' : 'Inquiry Cart'}（{items.length}）
            </h3>
            {items.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="text-xs text-gray-400 hover:text-red-600"
              >
                {locale === 'zh' ? '清空' : 'Clear'}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              {locale === 'zh' ? '询价车是空的' : 'Your inquiry cart is empty'}
            </p>
          ) : (
            <>
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.productId} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
                    <span className="flex-1 truncate text-sm text-gray-700">
                      {item.productName} × {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={locale === 'zh' ? '移除' : 'Remove'}
                      onClick={() => removeItem(item.productId)}
                      className="rounded p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/inquiry`}
                className="mt-3 flex min-h-touch items-center justify-center gap-2 rounded-btn bg-brand-green text-sm font-medium text-white hover:bg-brand-green/90"
              >
                {locale === 'zh' ? '提交询价' : 'Send Inquiry'}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      )}

      {/* 悬浮按钮 + 数量徽标 */}
      <button
        type="button"
        aria-label={locale === 'zh' ? '询价车' : 'Inquiry cart'}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-white shadow-lg hover:bg-brand-green/90"
      >
        {open ? <X size={22} /> : <ShoppingCart size={22} />}
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1 text-xs font-bold text-brand-green">
            {items.length}
          </span>
        )}
      </button>
    </div>
  );
}
