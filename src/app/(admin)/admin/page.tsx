// 后台登录页（/admin，阶段 13 正式版）
// 登录页纯净居中布局（AdminShell 识别 pathname === '/admin' 不挂侧边栏/计时器）
import { Leaf } from 'lucide-react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

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
        <AdminLoginForm />
      </div>
    </div>
  );
}
