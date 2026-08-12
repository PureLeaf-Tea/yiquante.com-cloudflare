'use client';

// 询价管理 + 实时聊天（InquiryAdmin.tsx）
// 左 30% 询价列表 + 右 70% 微信风格聊天窗；5 秒轮询（开发方案，后续改 WebSocket）
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Paperclip, Send, Check, CheckCheck, Package } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { toastError } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

interface InquiryRow {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  unreadMessages: number;
  itemNames: string[] | null;
}

interface ChatMessage {
  id: string;
  senderType: string;
  senderName: string | null;
  content: string;
  attachment: string | null;
  isRead: boolean;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new: { label: '新询价', cls: 'bg-brand-gold/20 text-yellow-700' },
  replied: { label: '已回复', cls: 'bg-brand-green/10 text-brand-green' },
  quoted: { label: '已报价', cls: 'bg-blue-50 text-blue-600' },
  closed: { label: '已关闭', cls: 'bg-gray-100 text-gray-400' },
};

const PAGE_SIZE = 25;

function timeStr(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // 新消息自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
        {/* 左侧列表（30%） */}
        <div
          className={cn(
            'flex w-full flex-col rounded-xl border border-gray-100 bg-white md:w-[30%]',
            mobileChatOpen && 'hidden md:flex'
          )}
        >
          <div className="border-b border-gray-100 p-3">
            <Select
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'new', label: '新询价' },
                { value: 'replied', label: '已回复' },
                { value: 'quoted', label: '已报价' },
                { value: 'closed', label: '已关闭' },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">暂无询价</p>
            ) : (
              rows.map((row) => {
                const st = STATUS_MAP[row.status] || { label: row.status, cls: 'bg-gray-100 text-gray-500' };
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => selectInquiry(row.id)}
                    className={cn(
                      'block w-full border-b border-gray-50 px-3 py-3 text-left transition-colors hover:bg-gray-50',
                      selectedId === row.id && 'bg-brand-green/5'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm font-medium text-gray-800">{row.name}</span>
                      {row.unreadMessages > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                          {row.unreadMessages}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn('rounded px-1.5 py-0.5 text-xs', st.cls)}>{st.label}</span>
                      <span className="truncate text-xs text-gray-400">
                        {row.itemNames?.filter(Boolean).join('、') || row.email}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-300">{timeStr(row.createdAt)}</p>
                  </button>
                );
              })
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="border-t border-gray-100 p-2">
              <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>
          )}
        </div>

        {/* 右侧聊天窗（70%） */}
        <div
          className={cn(
            'flex w-full flex-col rounded-xl border border-gray-100 bg-white md:w-[70%]',
            !mobileChatOpen && 'hidden md:flex'
          )}
        >
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-300">
              <Package size={40} aria-hidden="true" />
              <p className="text-sm">选择左侧询价开始聊天</p>
            </div>
          ) : (
            <>
              {/* 聊天头部 */}
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                <button
                  type="button"
                  aria-label="返回列表"
                  onClick={() => setMobileChatOpen(false)}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
                >
                  <ArrowLeft size={17} />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{selected?.name}</p>
                  <p className="text-xs text-gray-400">{selected?.email}</p>
                </div>
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-xs',
                    (STATUS_MAP[selected?.status || ''] || { cls: 'bg-gray-100 text-gray-500' }).cls
                  )}
                >
                  {(STATUS_MAP[selected?.status || ''] || { label: selected?.status }).label}
                </span>
              </div>

              {/* 消息区（微信风格） */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/50 p-4">
                {messages.map((m) => {
                  const isStaff = m.senderType === 'staff';
                  return (
                    <div key={m.id} className={cn('flex', isStaff ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%]', isStaff ? 'text-right' : 'text-left')}>
                        <p className="mb-1 text-xs text-gray-400">
                          {m.senderName || (isStaff ? '客服' : '客户')} · {timeStr(m.createdAt)}
                          {isStaff && (
                            <span className="ml-1 inline-flex align-middle" title={m.isRead ? '已读' : '未读'}>
                              {m.isRead ? (
                                <CheckCheck size={13} className="text-brand-green" aria-hidden="true" />
                              ) : (
                                <Check size={13} className="text-gray-400" aria-hidden="true" />
                              )}
                            </span>
                          )}
                        </p>
                        <div
                          className={cn(
                            'inline-block whitespace-pre-line break-words rounded-xl px-3 py-2 text-sm',
                            isStaff ? 'rounded-br-sm bg-brand-green text-white' : 'rounded-bl-sm bg-gray-200 text-gray-800'
                          )}
                        >
                          {m.content}
                          {m.attachment && (
                            <a
                              href={m.attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn('mt-1 block text-xs underline', isStaff ? 'text-white/80' : 'text-brand-green')}
                            >
                              查看附件
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* 输入区 */}
              <div className="border-t border-gray-100 p-3">
                {pendingAttachment && (
                  <p className="mb-2 flex items-center gap-2 text-xs text-brand-green">
                    <Paperclip size={13} aria-hidden="true" />
                    附件已就绪，将随消息发送
                    <button type="button" onClick={() => setPendingAttachment(null)} className="text-gray-400 hover:text-red-600">
                      取消
                    </button>
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <label
                    className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-btn border border-gray-200 text-gray-500 hover:border-brand-gold hover:text-brand-gold"
                    title="上传附件"
                  >
                    <Paperclip size={17} aria-hidden="true" />
                    <input type="file" className="hidden" onChange={attach} disabled={attaching} />
                  </label>
                  <textarea
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter 发送，Shift+Enter 换行
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                    aria-label="聊天输入框"
                    className="flex-1 resize-none rounded-btn border border-gray-300 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || attaching}
                    aria-label="发送"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-btn bg-brand-green px-5 text-sm font-medium text-white hover:bg-brand-green/90 disabled:opacity-50"
                  >
                    <Send size={15} aria-hidden="true" />
                    发送
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
