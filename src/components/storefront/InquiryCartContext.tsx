'use client';

// 询价车上下文（InquiryCartContext.tsx）
// 客户把产品加入询价车（localStorage 持久化），最后统一提交询价
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export interface InquiryCartItem {
  productId: string;
  productName: string;
  quantity: number;
  thumbnail?: string | null;
  priceCNY?: string | null;
}

interface InquiryCartContextValue {
  items: InquiryCartItem[];
  addItem: (item: InquiryCartItem) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  isInCart: (productId: string) => boolean;
}

const STORAGE_KEY = 'inquiry_cart';

const InquiryCartContext = createContext<InquiryCartContextValue | null>(null);

export function InquiryCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InquiryCartItem[]>([]);

  // 从 localStorage 恢复（仅客户端；SSR 与首次渲染均为空列表，不会水合不一致）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // 数据损坏时清空
    }
  }, []);

  const persist = useCallback((next: InquiryCartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 存储失败不阻断交互
    }
  }, []);

  const addItem = useCallback(
    (item: InquiryCartItem) => {
      setItems((prev) => {
        const exists = prev.find((i) => i.productId === item.productId);
        const next = exists
          ? prev.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i))
          : [...prev, item];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // 忽略存储失败
        }
        return next;
      });
    },
    []
  );

  const removeItem = useCallback(
    (productId: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.productId !== productId);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // 忽略存储失败
        }
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => persist([]), [persist]);

  const isInCart = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);

  return (
    <InquiryCartContext.Provider value={{ items, addItem, removeItem, clear, isInCart }}>
      {children}
    </InquiryCartContext.Provider>
  );
}

export function useInquiryCart() {
  const ctx = useContext(InquiryCartContext);
  if (!ctx) throw new Error('useInquiryCart 必须在 InquiryCartProvider 内使用');
  return ctx;
}
