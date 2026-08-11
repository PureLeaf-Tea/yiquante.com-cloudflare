'use client';

// Toast 轻提示组件（Toast.tsx）
// 封装 react-hot-toast：操作成功/失败的轻量反馈
// 规范（08 号文档 §4.1）：右上角弹出，3 秒后自动消失
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle2, XCircle } from 'lucide-react';

// 全局 Toaster 挂载点（在根布局挂一次即可）
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000, // 3 秒自动消失
        style: { fontSize: '14px' },
      }}
    />
  );
}

// ★成功提示（绿色对勾）：如"产品已保存"
export function toastSuccess(message: string) {
  toast.success(message, {
    icon: undefined, // 用 react-hot-toast 自带的绿色对勾样式
  });
}

// ★失败提示（红色叉）：如"操作失败：网络错误"
export function toastError(message: string) {
  toast.error(message);
}

// 需要自定义图标时直接导入 toast 使用
export { toast, CheckCircle2, XCircle };
