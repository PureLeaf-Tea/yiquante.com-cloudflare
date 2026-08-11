// 后台登录页占位（阶段 6）
// 阶段 13 替换为正式登录表单（手机号 + 密码 + JWT 签发 + 5 次锁定）
import { Leaf, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-white">
            <Leaf size={26} aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-brand-green">懿泉茶叶管理系统</h1>
          <p className="text-sm text-gray-500">员工登录入口</p>
        </div>
        <p className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 py-6 text-sm text-gray-400">
          <KeyRound size={16} aria-hidden="true" />
          阶段 13 构建正式登录表单
        </p>
      </div>
    </div>
  );
}
