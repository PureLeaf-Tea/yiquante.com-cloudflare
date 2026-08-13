'use client';

// GDPR Cookie 同意横幅（GDPRConsentBanner.tsx）
// 欧盟《通用数据保护条例》要求：欧盟访客首次访问需明确同意 Cookie 使用
// ★阶段 6 为 Cookie 占位版：未同意过就显示（方便开发调试 UI）
// ★阶段 8 接入 /api/gdpr/check：按 request.cf.country 判断欧盟 IP 才弹
import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const GDPR_COOKIE = 'GDPR_CONSENT';
const GDPR_SESSION_KEY = 'GDPR_SESSION_ID';

// 匿名会话标识（M1 修复：consent 接口要求 sessionId，用 localStorage 持久化的随机 UUID，不采集个人信息）
function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(GDPR_SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(GDPR_SESSION_KEY, id);
    return id;
  } catch {
    return 'anonymous';
  }
}

export function GDPRConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 已有同意记录则不再弹出
    const hasConsent = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${GDPR_COOKIE}=`));
    if (!hasConsent) setVisible(true);
  }, []);

  // 记录同意结果（all=全部接受 / necessary=仅必要 Cookie），1 年有效
  const handleConsent = (choice: 'all' | 'necessary') => {
    document.cookie = `${GDPR_COOKIE}=${choice}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setVisible(false);
    // ★M1 修复：同步写入 Neon gdpr_consents 表（POST /api/gdpr/consent）
    // 防重复策略：仅在用户点击时上报（横幅凭 GDPR_CONSENT cookie 只弹一次，不会每次加载重复调用）；
    // 失败不阻断浏览（合规记录尽力而为，本地 cookie 已保证用户体验）
    const consent = choice === 'all' ? ['necessary', 'analytics', 'marketing'] : ['necessary'];
    fetch('/api/gdpr/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getOrCreateSessionId(), consent }),
    }).catch((err) => {
      console.error('[GDPR] 同意记录上报失败（不影响浏览）', err);
    });
  };

  if (!visible) return null;

  return (
    // 底部固定横幅（06 号文档 §2：页面底部固定）
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <p className="flex items-start gap-2 text-sm text-gray-600">
          <Cookie size={18} className="mt-0.5 shrink-0 text-brand-gold" aria-hidden="true" />
          我们使用 Cookie 提升浏览体验并分析流量。继续浏览即表示您同意我们按《隐私政策》使用
          Cookie（GDPR）。
        </p>
        <div className="flex shrink-0 gap-3">
          <Button size="sm" variant="ghost" onClick={() => handleConsent('necessary')}>
            仅必要
          </Button>
          <Button size="sm" onClick={() => handleConsent('all')}>
            接受全部
          </Button>
        </div>
      </div>
    </div>
  );
}
