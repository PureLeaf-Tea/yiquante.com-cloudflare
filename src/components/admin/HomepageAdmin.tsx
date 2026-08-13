'use client';

// 首页编辑（HomepageAdmin.tsx，07 号文档）
// R2 拆分：区块定义 → homepage/homepageSections.ts；单区块编辑器 → homepage/SectionEditor.tsx；
// 模块显隐面板 → homepage/HomepageVisibilityPanel.tsx（状态自包含）。本组件仅负责页面编排。
import { SECTIONS } from './homepage/homepageSections';
import { SectionEditor } from './homepage/SectionEditor';
import { HomepageVisibilityPanel } from './homepage/HomepageVisibilityPanel';

export function HomepageAdmin() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">首页编辑</h1>

      {/* 区块显隐开关 */}
      <HomepageVisibilityPanel />

      {/* 四区块编辑器 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {SECTIONS.map((def) => (
          <SectionEditor key={def.key} def={def} />
        ))}
      </div>
    </div>
  );
}
