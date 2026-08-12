// 聊天气泡（ChatBubble.tsx）
// 客户消息左对齐灰底，客服消息右对齐品牌绿底白字；带时间戳
import { cn } from '@/lib/cn';

export interface ChatBubbleMessage {
  id: string;
  senderType: string; // customer | staff
  senderName: string | null;
  content: string;
  attachment?: string | null;
  createdAt: string;
}

export function ChatBubble({ message, locale }: { message: ChatBubbleMessage; locale: string }) {
  const zh = locale === 'zh';
  const isCustomer = message.senderType === 'customer';
  const d = new Date(message.createdAt);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return (
    <div className={cn('flex', isCustomer ? 'justify-start' : 'justify-end')}>
      <div className={cn('max-w-[80%]', isCustomer ? 'text-left' : 'text-right')}>
        <p className="mb-1 text-[11px] text-gray-400">
          {message.senderName || (isCustomer ? (zh ? '我' : 'Me') : zh ? '客服' : 'Support')} · {time}
        </p>
        <div
          className={cn(
            'inline-block whitespace-pre-line break-words rounded-xl px-3 py-2 text-sm',
            isCustomer ? 'rounded-bl-sm bg-gray-200 text-gray-800' : 'rounded-br-sm bg-brand-green text-white'
          )}
        >
          {message.content}
          {message.attachment && (
            <a
              href={message.attachment}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('mt-1 block text-xs underline', isCustomer ? 'text-brand-green' : 'text-white/80')}
            >
              {zh ? '查看附件' : 'View attachment'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
