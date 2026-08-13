// 询价管理共享类型与工具（R2 拆分自 InquiryAdmin.tsx）

export interface InquiryRow {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  unreadMessages: number;
  itemNames: string[] | null;
}

export interface ChatMessage {
  id: string;
  senderType: string;
  senderName: string | null;
  content: string;
  attachment: string | null;
  isRead: boolean;
  createdAt: string;
}

export const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new: { label: '新询价', cls: 'bg-brand-gold/20 text-yellow-700' },
  replied: { label: '已回复', cls: 'bg-brand-green/10 text-brand-green' },
  quoted: { label: '已报价', cls: 'bg-blue-50 text-blue-600' },
  closed: { label: '已关闭', cls: 'bg-gray-100 text-gray-400' },
};

export const PAGE_SIZE = 25;

export function timeStr(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
