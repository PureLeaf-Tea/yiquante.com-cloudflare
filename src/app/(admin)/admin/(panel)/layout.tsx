// 后台 (panel) 分组布局：鉴权守卫
// 未登录（无有效 JWT Cookie）→ 重定向登录页；登录页在 /admin 不经过本布局
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/admin');
  }

  return <>{children}</>;
}
