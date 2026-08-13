// 统一日志工具（logger.ts，R1 修复）
// 策略：dev() 仅非生产打印（避免邮件正文等敏感内容进生产日志）；
//       info()/error() 始终打印并统一带 [yiquantea] 前缀。极简实现，不引第三方库。

const PREFIX = '[yiquantea]';

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

// 仅开发环境打印（调试信息、敏感内容预览等）
export const logger = {
  dev(...args: unknown[]): void {
    if (!isProd()) console.log(PREFIX, '[dev]', ...args);
  },
  info(...args: unknown[]): void {
    console.log(PREFIX, ...args);
  },
  error(...args: unknown[]): void {
    console.error(PREFIX, ...args);
  },
};
