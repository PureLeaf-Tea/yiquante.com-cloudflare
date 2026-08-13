'use client';

// 询价聊天右面板（R2 拆分自 InquiryAdmin.tsx：微信风格聊天窗，纯展示 + 回调；自动滚底 effect 内置）
import { useEffect, useRef } from 'react';
import { ArrowLeft, Paperclip, Send, Check, CheckCheck, Package } from 'lucide-react';
import { cn } from '@/lib/cn';
import { STATUS_MAP, timeStr, type ChatMessage, type InquiryRow } from './inquiryShared';

export function InquiryChatPanel({
  selected,
  selectedId,
  messages,
  input,
  sending,
  attaching,
  pendingAttachment,
  hiddenOnMobile,
  onInput,
  onSend,
  onAttach,
  onCancelAttachment,
  onBackToList,
}: {
  selected: InquiryRow | undefined;
  selectedId: string | null;
  messages: ChatMessage[];
  input: string;
  sending: boolean;
  attaching: boolean;
  pendingAttachment: string | null;
  hiddenOnMobile: boolean;
  onInput: (v: string) => void;
  onSend: () => void;
  onAttach: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelAttachment: () => void;
  onBackToList: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-xl border border-gray-100 bg-white md:w-[70%]',
        hiddenOnMobile && 'hidden md:flex'
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
              onClick={onBackToList}
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
                <button type="button" onClick={onCancelAttachment} className="text-gray-400 hover:text-red-600">
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
                <input type="file" className="hidden" onChange={onAttach} disabled={attaching} />
              </label>
              <textarea
                rows={2}
                value={input}
                onChange={(e) => onInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter 发送，Shift+Enter 换行
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                aria-label="聊天输入框"
                className="flex-1 resize-none rounded-btn border border-gray-300 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-brand-green"
              />
              <button
                type="button"
                onClick={onSend}
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
  );
}
