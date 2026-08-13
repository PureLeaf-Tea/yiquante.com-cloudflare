'use client';

// 首页模块显隐设置面板（R2 拆分自 HomepageAdmin.tsx：homepage configJson 开关区，状态自包含）
import { useCallback, useEffect, useState } from 'react';
import { Switch } from '@/components/ui/Switch';
import { toastSuccess, toastError } from '@/components/ui/Toast';

export function HomepageVisibilityPanel() {
  const [config, setConfig] = useState<{ showReviews?: boolean; showCertifications?: boolean; showB2bEntry?: boolean }>({});
  const [savingConfig, setSavingConfig] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config/homepage');
      const data = (await res.json()) as { success?: boolean; data?: { configJson?: string } };
      if (data.success && data.data?.configJson) {
        try {
          setConfig(JSON.parse(data.data.configJson));
        } catch {
          // 损坏保持默认
        }
      }
    } catch {
      // 加载失败保持默认
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const toggleConfig = async (key: 'showReviews' | 'showCertifications' | 'showB2bEntry') => {
    const next = { ...config, [key]: !(config[key] !== false) };
    setConfig(next);
    setSavingConfig(true);
    try {
      await fetch('/api/config/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configJson: JSON.stringify(next) }),
      });
      toastSuccess('已保存');
    } catch {
      toastError('网络错误');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">模块显示设置 {savingConfig && <span className="text-xs text-gray-400">保存中...</span>}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <span className="text-sm text-gray-600">B2B 入口卡片</span>
          <Switch checked={config.showB2bEntry !== false} onChange={() => toggleConfig('showB2bEntry')} label="B2B 入口" />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <span className="text-sm text-gray-600">认证展示区</span>
          <Switch checked={config.showCertifications !== false} onChange={() => toggleConfig('showCertifications')} label="认证展示" />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <span className="text-sm text-gray-600">客户评价区</span>
          <Switch checked={config.showReviews !== false} onChange={() => toggleConfig('showReviews')} label="客户评价" />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <span className="text-sm text-gray-400">产品分类入口（常显，分类在「分类管理」维护）</span>
        </div>
      </div>
    </div>
  );
}
