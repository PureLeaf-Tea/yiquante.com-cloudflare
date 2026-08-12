// 操作指南（/admin/guide）— 纯前端静态帮助文档，无需 API
'use client';

import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/cn';

interface GuideSection {
  title: string;
  steps: string[];
  tips?: string[];
}

const SECTIONS: GuideSection[] = [
  {
    title: 'B2B 展示区使用教程',
    steps: [
      '进入「展示区管理」，点击「新增分类」创建 B2B 分类（名称中英双语 + slug + 初始访问密码）。',
      '在分类行点击「产品管理」，从产品库选择要展示的产品并设置展示语言（中文/英文）。',
      '客户访问前台 /b2b 页面 → 选择分类 → 输入密码 → 查看产品列表 → 进入独立详情页。',
      '独立详情页无导航页脚、不被搜索引擎收录（noindex），适合生成二维码发给客户。',
      '需要修改密码时：点击分类行「密码管理」→ 输入新密码保存；查看明文需输入管理员登录密码二次验证。',
    ],
    tips: [
      '密码错误 5 次将锁定 30 分钟，请妥善保管密码。',
      '产品的「展示区显示价格」开关在产品管理 → 编辑 → 展示区标签页中设置。',
    ],
  },
  {
    title: '聊天系统教程',
    steps: [
      '客户在前台提交询价后，右下角聊天窗口自动开通（凭证为询价 ID）。',
      '员工进入「询价管理」→ 左侧选择询价 → 右侧聊天窗回复；客户消息左灰底、员工消息右绿底。',
      '打开会话会自动把客户消息标记为已读；列表未读角标实时刷新（5 秒轮询）。',
      '员工首次回复后，询价状态自动从「新询价」流转为「已回复」。',
      '可上传附件（图片等），附件链接随消息发送。',
    ],
    tips: ['已关闭的询价不能再收发消息，如需继续沟通请先改回其他状态。'],
  },
  {
    title: '样品管理教程',
    steps: [
      '客户在前台 /sample 提交样品申请（姓名/邮箱/地址必填）。',
      '员工进入「样品管理」，用顶部筛选查看：全部 / 新申请 / 处理中 / 已发货 / 已关闭。',
      '点击「详情」查看申请人与样品需求，按流程流转状态：新申请 → 处理中 → 已发货 → 已关闭。',
      '状态改为「已发货」时必须填写物流单号。',
      '详情页底部「状态变更历史」展示该申请的完整操作时间线。',
    ],
    tips: ['样品免费，运费由买方承担（前台页面已注明）。'],
  },
  {
    title: '备份教程',
    steps: [
      '进入「备份管理」查看自动备份计划（每天 03:00 Workers Cron 执行）与上次备份状态。',
      '需要立即备份时点击「立即备份」手动触发。',
      '本页不提供下载按钮——备份文件存于 R2 私有桶，仅管理员可通过 Cloudflare 控制台获取。',
      '数据库另享 Neon 自带的 6 小时时间点恢复（PITR）能力。',
    ],
    tips: ['上线接入 R2 前，手动备份为演练模式（只记录操作日志，不产生文件）。'],
  },
  {
    title: '产品管理教程',
    steps: [
      '进入「产品管理」→「新增产品」，先保存基本信息（中英文名/分类/价格/规格）创建产品。',
      '创建后在编辑弹窗的其余标签页完善：图片（上传/删除）、视频（MP4/360°）、布局（拖拽调整详情页区块顺序与显隐）、展示区（关联 B2B 分类）。',
      '表格行开关控制上架/下架；下架产品前台不可见（员工登录后可预览）。',
      '删除产品需输入产品名称二次确认，操作不可撤销。',
    ],
    tips: ['布局标签页决定前台详情页区块的展示顺序，未启用的区块不会渲染。'],
  },
];

export function GuideAdmin() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
        <BookOpen size={19} className="text-brand-gold" aria-hidden="true" />
        操作指南
      </h1>
      <p className="text-sm text-gray-400">按模块整理的后台操作说明，点击标题展开。</p>

      <div className="space-y-3">
        {SECTIONS.map((sec, i) => {
          const open = openIndex === i;
          return (
            <div key={sec.title} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-gray-700">{sec.title}</span>
                <ChevronDown size={16} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} aria-hidden="true" />
              </button>
              {open && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-600">
                    {sec.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  {sec.tips && (
                    <div className="mt-3 space-y-1 rounded-lg bg-brand-gold/10 px-3 py-2">
                      {sec.tips.map((t) => (
                        <p key={t} className="text-xs text-yellow-700">
                          提示：{t}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
