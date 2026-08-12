'use client';

// hCaptcha 验证码框（HCaptchaBox.tsx）
// 询价/样品表单共用：验证通过回调 token；过期/失败置 null 使提交按钮重新置灰
// 移动端（<640px）自动切换 compact 紧凑模式；加载失败显示友好文字（非弹窗）
import { useEffect, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

// 前台 locale → hCaptcha 语言码（hl 参数）
const HL_MAP: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en',
  ru: 'ru',
  de: 'de',
  es: 'es',
  fr: 'fr',
};

export function HCaptchaBox({
  locale,
  onToken,
}: {
  locale: string;
  onToken: (token: string | null) => void;
}) {
  const sitekey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
  const [loadError, setLoadError] = useState(false);
  const [compact, setCompact] = useState(false);

  // 视口宽度自适应：<640px 用 compact 模式
  useEffect(() => {
    const check = () => setCompact(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 未配置 sitekey（开发环境）：占位提示并放行，由服务端决定是否校验
  useEffect(() => {
    if (!sitekey) onToken('hcaptcha-not-configured');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitekey]);

  if (!sitekey) {
    return <p className="text-xs text-gray-400">人机验证未配置（开发模式）</p>;
  }

  if (loadError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500" role="alert">
        验证码加载失败，请刷新页面重试。若持续失败请稍后再来。
      </p>
    );
  }

  return (
    <div className="flex justify-start">
      <HCaptcha
        sitekey={sitekey}
        size={compact ? 'compact' : 'normal'}
        // hl：hCaptcha 渲染参数的语言码（类型定义未收录，运行时透传）
        {...({ hl: HL_MAP[locale] || 'en' } as Record<string, string>)}
        onVerify={(token) => {
          setLoadError(false);
          onToken(token);
        }}
        onExpire={() => onToken(null)}
        onClose={() => onToken(null)}
        onError={() => {
          setLoadError(true);
          onToken(null);
        }}
      />
    </div>
  );
}
