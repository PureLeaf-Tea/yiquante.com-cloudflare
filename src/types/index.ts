// 全站共享类型定义（types/index.ts）
// 阶段 3/8 会在这里补充：产品、分类、询价、样品、B2B 等业务类型
// 占位：后台登录用户类型（与 src/lib/auth.ts 的 AuthUser 保持一致）

// 后台三种角色：管理员 / 编辑 / 客服
export type UserRole = 'admin' | 'editor' | 'customer_service';

// 本站支持的 6 种语言代码
export type Locale = 'en' | 'zh' | 'ru' | 'de' | 'es' | 'fr';
