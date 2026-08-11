'use client';

// B2B 24 小时访问 Token 管理（useB2BAccess.ts）
// 客户输入 B2B 分类密码验证成功后，服务端签发 token；前端存 localStorage，24 小时内免输密码
import { useState, useEffect, useCallback } from 'react';

// ★和老版的区别：老版存 localStorage，新版一样存 localStorage。
// 验证逻辑从查 Neon 表变成查 KV（更快）。

const B2B_STORAGE_KEY = 'b2b_access_tokens';
const ACCESS_DURATION_HOURS = 24;

// 单个分类的访问凭证
interface B2BAccessToken {
  categoryId: string;
  token: string;
  expiresAt: number; // Unix 时间戳（毫秒）
}

export function useB2BAccess(categoryId?: string) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 读取 localStorage 中所有分类的 token（解析失败返回空数组，不抛错）
  const getTokens = useCallback((): B2BAccessToken[] => {
    try {
      const raw = localStorage.getItem(B2B_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  // 清理已过期的 token（每次读写前都清一遍，防止垃圾堆积）
  const cleanExpiredTokens = useCallback(() => {
    const tokens = getTokens();
    const now = Date.now();
    const valid = tokens.filter((t) => t.expiresAt > now);
    localStorage.setItem(B2B_STORAGE_KEY, JSON.stringify(valid));
    return valid;
  }, [getTokens]);

  // 检查指定分类是否有有效访问权
  const checkAccess = useCallback(
    (catId: string) => {
      const tokens = cleanExpiredTokens();
      return tokens.some((t) => t.categoryId === catId);
    },
    [cleanExpiredTokens]
  );

  // 密码验证成功后调用：保存服务端签发的 token，授予 24 小时访问权
  const grantAccess = useCallback(
    (catId: string, token: string) => {
      const tokens = cleanExpiredTokens();
      // 同一分类只保留最新 token
      const filtered = tokens.filter((t) => t.categoryId !== catId);
      filtered.push({
        categoryId: catId,
        token,
        expiresAt: Date.now() + ACCESS_DURATION_HOURS * 60 * 60 * 1000,
      });
      localStorage.setItem(B2B_STORAGE_KEY, JSON.stringify(filtered));
      setHasAccess(true);
    },
    [cleanExpiredTokens]
  );

  // 组件挂载时自动检查当前分类的访问状态
  useEffect(() => {
    if (categoryId) {
      setHasAccess(checkAccess(categoryId));
    }
    setIsLoading(false);
  }, [categoryId, checkAccess]);

  return { hasAccess, isLoading, checkAccess, grantAccess };
}
