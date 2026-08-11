'use client';

// 产品对比上下文（CompareContext.tsx）
// 最多选 3 个产品对比（02 §9.7 体验规则）；localStorage 持久化
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { toastError } from '@/components/ui/Toast';

export interface CompareItem {
  productId: string;
  nameZh: string;
  nameEn: string;
  thumbnail?: string | null;
}

interface CompareContextValue {
  items: CompareItem[];
  toggle: (item: CompareItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isCompared: (productId: string) => boolean;
}

const STORAGE_KEY = 'compare_items';
const MAX_COMPARE = 3;

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  // 从 localStorage 恢复（仅客户端；SSR 与首次渲染均为空列表，不会水合不一致）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // 数据损坏时忽略
    }
  }, []);

  const toggle = useCallback((item: CompareItem) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.productId === item.productId);
      if (exists) {
        const next = prev.filter((i) => i.productId !== item.productId);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // 忽略
        }
        return next;
      }
      if (prev.length >= MAX_COMPARE) {
        // 超出上限提示（02 号文档：最多对比 3 个）
        toastError('最多可对比 3 个产品');
        return prev;
      }
      const next = [...prev, item];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 忽略
      }
      return next;
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 忽略
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略
    }
  }, []);

  const isCompared = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);

  return (
    <CompareContext.Provider value={{ items, toggle, remove, clear, isCompared }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare 必须在 CompareProvider 内使用');
  return ctx;
}
