'use client';

// 二维码按钮（QRCodeButton.tsx）
// 展示区产品自动生成二维码（02 §6.1）：弹窗展示 /api/showcase/[id]/qrcode 真实 PNG + 下载按钮（收尾任务 4）
import { useState } from 'react';
import { QrCode, X, Download } from 'lucide-react';

export function QRCodeButton({ slug, locale }: { slug: string; locale: string }) {
  const [open, setOpen] = useState(false);
  const zh = locale === 'zh';
  const qrSrc = `/api/showcase/${slug}/qrcode?locale=${locale}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-btn border border-gray-200 px-4 text-sm text-gray-600 hover:border-brand-gold hover:text-brand-gold"
      >
        <QrCode size={16} aria-hidden="true" />
        {zh ? '二维码' : 'QR Code'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative rounded-xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={zh ? '关闭' : 'Close'}
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X size={16} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt={zh ? '产品二维码' : 'Product QR code'}
              className="mx-auto h-56 w-56"
            />
            <a
              href={qrSrc}
              download={`${slug}-qrcode.png`}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-btn bg-brand-green px-4 text-sm text-white hover:bg-brand-green/90"
            >
              <Download size={15} aria-hidden="true" />
              {zh ? '下载二维码' : 'Download QR'}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
