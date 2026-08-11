// 类名合并工具（cn.ts）
// clsx：条件拼接 class 字符串的小工具；tailwind-merge：合并冲突的 Tailwind 类（后者覆盖前者）
// cn() 是 shadcn/ui 的标准写法：所有组件的 className 都经过它合并
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
