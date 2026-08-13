'use client';

// 询价列表左面板（R2 拆分自 InquiryAdmin.tsx：筛选 + 列表 + 分页，纯展示 + 回调）
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { STATUS_MAP, PAGE_SIZE, timeStr, type InquiryRow } from './inquiryShared';

export function InquiryListPanel({
  rows,
  total,
  page,
  statusFilter,
  selectedId,
  hiddenOnMobile,
  onSelect,
  onFilter,
  onPage,
}: {
  rows: InquiryRow[];
  total: number;
  page: number;
  statusFilter: string;
  selectedId: string | null;
  hiddenOnMobile: boolean;
  onSelect: (id: string) => void;
  onFilter: (v: string) => void;
  onPage: (p: number) => void;
}) {
  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-xl border border-gray-100 bg-white md:w-[30%]',
        hiddenOnMobile && 'hidden md:flex'
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
          onChange={(e) => onFilter(e.target.value)}
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
                onClick={() => onSelect(row.id)}
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
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={onPage} />
        </div>
      )}
    </div>
  );
}
