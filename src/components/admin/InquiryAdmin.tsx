'use client';

// 询价管理 + 实时聊天（InquiryAdmin.tsx）
// R2 拆分：左列表面板 → inquiry/InquiryListPanel.tsx；右聊天面板 → inquiry/InquiryChatPanel.tsx；
// 共享类型 → inquiry/inquiryShared.ts。本组件保留数据加载/轮询/发送/附件等全部逻辑。
// 5 秒轮询（开发方案，后续改 WebSocket）
import { useCallback, useEffect, useState } from 'react';
import { toastError } from '@/components/ui/Toast';
import { PAGE_SIZE, type InquiryRow, type ChatMessage } from './inquiry/inquiryShared';
import { InquiryListPanel } from './inquiry/InquiryListPanel';
import { InquiryChatPanel } from './inquiry/InquiryChatPanel';

export function InquiryAdmin() {
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<string | null>(null);
  // 移动端：列表/聊天切换
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // ---------- 列表 ----------
  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/inquiries?${params.toString()}`);
      const data = (await res.json()) as { success?: boolean; data?: InquiryRow[]; total?: number };
      if (data.success && data.data) {
        setRows(data.data);
        setTotal(data.total || 0);
      }
    } catch {
      // 轮询失败静默
    }
  }, [page, statusFilter]);

  // ---------- 消息 ----------
  const loadMessages = useCallback(async (id: string, markRead: boolean) => {
    try {
      const res = await fetch(`/api/inquiries/${id}/messages`);
      const data = (await res.json()) as { success?: boolean; data?: ChatMessage[] };
      if (data.success && data.data) {
        setMessages(data.data);
        // 打开会话即把客户消息标为已读
        if (markRead && data.data.some((m) => m.senderType === 'customer' && !m.isRead)) {
          fetch(`/api/inquiries/${id}/messages/read`, { method: 'POST' }).catch(() => {});
        }
      }
    } catch {
      // 轮询失败静默
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId, true);
    // ★5 秒轮询（开发阶段方案，后续阶段改 WebSocket）
    const timer = setInterval(() => {
      loadList();
      loadMessages(selectedId, true);
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedId, loadList, loadMessages]);

  const selectInquiry = (id: string) => {
    setSelectedId(id);
    setMobileChatOpen(true);
    setMessages([]);
    setInput('');
    setPendingAttachment(null);
  };

  // ---------- 发送 ----------
  const send = async () => {
    if (!selectedId || (!input.trim() && !pendingAttachment)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/inquiries/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() || '（附件）', attachment: pendingAttachment }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toastError(data.error || '发送失败');
        return;
      }
      setInput('');
      setPendingAttachment(null);
      await loadMessages(selectedId, false);
      await loadList();
    } catch {
      toastError('网络错误');
    } finally {
      setSending(false);
    }
  };

  // 附件：上传 → 拿到 URL → 随下一条消息发送
  const attach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttaching(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: { url: string } };
      if (!res.ok || !data.success || !data.data) {
        toastError(data.error || '上传失败');
        return;
      }
      setPendingAttachment(data.data.url);
    } catch {
      toastError('网络错误');
    } finally {
      setAttaching(false);
    }
  };

  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">询价管理</h1>

      <div className="flex h-[calc(100vh-180px)] min-h-[480px] gap-4">
        <InquiryListPanel
          rows={rows}
          total={total}
          page={page}
          statusFilter={statusFilter}
          selectedId={selectedId}
          hiddenOnMobile={mobileChatOpen}
          onSelect={selectInquiry}
          onFilter={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          onPage={setPage}
        />

        <InquiryChatPanel
          selected={selected}
          selectedId={selectedId}
          messages={messages}
          input={input}
          sending={sending}
          attaching={attaching}
          pendingAttachment={pendingAttachment}
          hiddenOnMobile={!mobileChatOpen}
          onInput={setInput}
          onSend={send}
          onAttach={attach}
          onCancelAttachment={() => setPendingAttachment(null)}
          onBackToList={() => setMobileChatOpen(false)}
        />
      </div>
    </div>
  );
}
