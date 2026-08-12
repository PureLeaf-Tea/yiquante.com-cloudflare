'use client';

// Service Worker 注册组件（收尾任务 1：PWA 支持）
// 挂载在两个根布局（前台 [locale] / 后台 admin），生产环境才注册，防重复注册
import { useEffect } from 'react';

export function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return; // dev 不注册，避免热更新干扰
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistration()
      .then((existing) => {
        if (existing) return; // 已注册过，跳过
        return navigator.serviceWorker.register('/sw.js', { scope: '/' });
      })
      .catch(() => {
        // 注册失败不影响正常浏览（HTTPS/支持性问题）
      });
  }, []);

  return null;
}
