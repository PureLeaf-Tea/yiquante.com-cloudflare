'use client';

// 后台 1 小时无操作自动退出（useInactivityTimer.ts）
// 监听用户操作事件，每次操作重置倒计时；60 分钟无任何操作则清除登录态并跳回登录页
import { useEffect, useRef, useCallback } from 'react';

// ★和老版的区别：老版用 NextAuth 的 session maxAge，
// 新版用自写 Hook + 清除 Cookie token。功能完全一样：1 小时无操作自动退出。
export function useInactivityTimer(timeoutMinutes = 60) {
  // ReturnType<typeof setTimeout>：跨 Node/Edge 环境的定时器句柄类型写法
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 重置倒计时（任何用户操作都会触发）
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // 到期：清除登录 token（Cookie 过期写法）
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      // 跳转登录页（expired=1 用于提示"会话已过期"）
      window.location.href = '/admin?expired=1';
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes]);

  useEffect(() => {
    // 5 类用户操作事件都会重置计时
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => document.addEventListener(event, resetTimer));

    resetTimer(); // 初始启动

    // 组件卸载时清理（防止后台页面切换后计时器泄漏）
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);
}
