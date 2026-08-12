'use client';

// 前台客户聊天窗口（ChatWidget.tsx，06 号文档 §十）
// 右下角浮动按钮 → 展开聊天窗；凭询价提交时保存的 chatToken 收发消息；5 秒轮询新消息
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, X, Send } from 'lucide-react';
import { ChatBubble, type ChatBubbleMessage } from './ChatBubble';

const STORAGE_KEY = 'inquiry_chat_id';

export function ChatWidget({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatBubbleMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  // 读取询价凭证（InquiryForm 提交成功后写入 localStorage）
  useEffect(() => {
    try {
      setChatId(localStorage.getItem(STORAGE_KEY));
    } catch {
      setChatId(null);
    }
  }, [open]);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const res = await fetch(`/api/inquiries/${chatId}/messages/guest?chatToken=${encodeURIComponent(chatId)}`);
      const data = (await res.json()) as { success?: boolean; data?: ChatBubbleMessage[] };
      if (data.success && data.data) {
        setMessages(data.data);
        // 窗口关闭时收到新客服消息 → 红点提示
        if (data.data.length > lastCountRef.current && lastCountRef.current > 0) {
          const newest = data.data[data.data.length - 1];
          if (newest?.senderType === 'staff' && !open) setHasNew(true);
        }
        lastCountRef.current = data.data.length;
      }
    } catch {
      // 轮询失败静默
    }
  }, [chatId, open]);

  useEffect(() => {
    if (!chatId) return;
    loadMessages();
    // ★5 秒轮询（开发阶段，后续改 WebSocket）
    const timer = setInterval(loadMessages, 5000);
    return () => clearInterval(timer);
  }, [chatId, loadMessages]);

  useEffect(() => {
    if (open) {
      setHasNew(false);
      bottomRef.current?.scrollIntoView();
    }
  }, [open, messages.length]);

  const send = async () => {
    if (!chatId || !input.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/inquiries/${chatId}/messages/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim(), chatToken: chatId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setInput('');
        await loadMessages();
      }
    } catch {
      // 发送失败保留输入内容
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3">
      {/* 聊天窗口 */}
      {open && (
        <div className="flex h-[28rem] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between bg-brand-green px-4 py-3 text-white">
            <p className="text-sm font-semibold">{zh ? '在线客服' : 'Live Chat'}</p>
            <button type="button" aria-label={zh ? '关闭' : 'Close'} onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20">
              <X size={16} />
            </button>
          </div>

          {chatId ? (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/60 p-3">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">
                    {zh ? '暂无消息，发送第一条消息开始对话' : 'No messages yet. Say hello!'}
                  </p>
                ) : (
                  messages.map((m) => <ChatBubble key={m.id} message={m} locale={locale} />)
                )}
                <div ref={bottomRef} />
              </div>
              <div className="flex items-end gap-2 border-t border-gray-100 p-2.5">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={zh ? '输入消息，Enter 发送' : 'Type a message, Enter to send'}
                  aria-label={zh ? '聊天输入框' : 'Chat input'}
                  className="min-h-10 flex-1 resize-none rounded-btn border border-gray-300 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
                />
                <button
                  type="button"
                  aria-label={zh ? '发送' : 'Send'}
                  onClick={send}
                  disabled={sending}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-btn bg-brand-green text-white hover:bg-brand-green/90 disabled:opacity-50"
                >
                  <Send size={15} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-gray-500">
                {zh ? '提交询价后即可与客服在线沟通' : 'Submit an inquiry to start chatting with our team'}
              </p>
              <Link
                href={`/${locale}/inquiry`}
                className="inline-flex min-h-touch items-center rounded-btn bg-brand-green px-5 text-sm font-medium text-white hover:bg-brand-green/90"
              >
                {zh ? '去提交询价' : 'Send Inquiry'}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 浮动按钮 */}
      <button
        type="button"
        aria-label={zh ? '在线客服' : 'Live chat'}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold text-brand-green shadow-lg hover:bg-brand-gold/90"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {hasNew && !open && (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
