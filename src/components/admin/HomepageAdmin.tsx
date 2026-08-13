'use client';

// 首页编辑（HomepageAdmin.tsx，07 号文档）
// R2 拆分：区块定义 → homepage/homepageSections.ts；单区块编辑器 → homepage/SectionEditor.tsx；
// 模块显隐面板 → homepage/HomepageVisibilityPanel.tsx（状态自包含）。本组件仅负责页面编排。
// N1：Hero 拆为「电脑端轮播 / 手机端轮播」两个独立区块（device=desktop/mobile）
import { SECTIONS, heroDesktopDef, heroMobileDef } from './homepage/homepageSections';
import { SectionEditor } from './homepage/SectionEditor';
import { HomepageVisibilityPanel } from './homepage/HomepageVisibilityPanel';

export function HomepageAdmin() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">首页编辑</h1>

      {/* 区块显隐开关 */}
      <HomepageVisibilityPanel />

      {/* N1：Hero 双列表独立编辑（电脑端 12:5 / 手机端 5:6） */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionEditor def={heroDesktopDef} device="desktop" />
        <SectionEditor def={heroMobileDef} device="mobile" />
      </div>

      {/* 其余三区块编辑器 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {SECTIONS.map((def) => (
          <SectionEditor key={def.key} def={def} />
        ))}
      </div>
    </div>
  );
}
