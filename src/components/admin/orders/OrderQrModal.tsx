'use client';

// 订单二维码弹窗（OrderQrModal.tsx，订单模块第 2 期，需求文档 §5.2）
// 展示前台订单链接的二维码（白底深色码、留白充足，可打印/截图）+ 复制链接 + 新窗口打开
import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { orderPageUrl } from './ordersShared';

export function OrderQrModal({
  open,
  onClose,
  orderNo,
  customerName,
}: {
  open: boolean;
  onClose: () => void;
  orderNo: string;
  customerName: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const link = orderPageUrl(orderNo);

  // 复制链接：优先 Clipboard API，降级临时 textarea
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toastSuccess('链接已复制，可粘贴到微信发送');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toastSuccess('链接已复制，可粘贴到微信发送');
      } catch {
        toastError('复制失败，请手动复制下方链接');
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="订单二维码">
      <div className="flex flex-col items-center gap-4">
        {customerName && <p className="text-sm text-gray-600">客户：{customerName}</p>}
        {/* 白底卡片：留白充足，方便打印/截图 */}
        <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qrcode?url=${encodeURIComponent(link)}`}
            alt={`订单 ${orderNo} 二维码`}
            width={280}
            height={280}
          />
        </div>
        <p className="max-w-full break-all text-center font-mono text-xs text-gray-500">{link}</p>
        <div className="flex gap-2">
          <Button icon={Copy} variant={copied ? 'outline' : undefined} onClick={copy}>
            {copied ? '已复制' : '复制链接'}
          </Button>
          <Button icon={ExternalLink} variant="outline" onClick={() => window.open(link, '_blank', 'noopener')}>
            新窗口打开订单页
          </Button>
        </div>
      </div>
    </Modal>
  );
}
