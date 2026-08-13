// JWT 认证（auth.ts）
// jose：轻量 JWT（JSON Web Token，登录令牌）签发/校验库，代替老版 NextAuth.js
// JWT 由服务端用 AUTH_SECRET 签名，客户端无法伪造
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// AUTH_SECRET：JWT 签名密钥（.env 中配置，随机生成至少 32 位）
// ★S2 安全修复：模块加载时强制校验密钥——缺失/过短直接抛错拒绝启动，
// 避免空密钥签发的 JWT 被伪造（role:'admin' 令牌伪造风险）
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error('AUTH_SECRET 未配置或长度不足 32 位，拒绝启动（请在 .env / wrangler secret 中配置随机密钥）');
}
const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);
const SESSION_DURATION = 60 * 60; // 1 小时（秒）

// 登录用户信息（会编码进 JWT payload）
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'editor' | 'customer_service';
}

// ★签发 JWT（登录时调用）
export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' }) // HS256：HMAC-SHA256 对称签名算法
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(AUTH_SECRET);
}

// ★校验 JWT（每次请求时调用）；无效/过期返回 null
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

// ★从 Cookie 获取当前登录用户（未登录返回 null）
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ★检查用户是否有指定角色权限
export function hasRole(user: AuthUser | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// ★后台登录密码哈希（使用 Web Crypto API 代替 bcryptjs）
// SHA-256：单向哈希算法，不可逆；加盐方式为拼接 AUTH_SECRET
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + process.env.AUTH_SECRET);
  // crypto.subtle：浏览器/Workers 原生的加密 API，无需外部库
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ★恒定时间比较两个十六进制哈希串（M3 修复：消除字符串 === 的理论计时侧信道）
// 实现依据：长度不同直接判 false（SHA-256 hex 恒为 64 位，长度属公开信息，不泄漏秘密）；
// 长度相同时逐字节 XOR 后按位或累加，循环无提前退出分支，比较耗时与内容无关
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 2) {
    const byteA = parseInt(a.slice(i, i + 2), 16);
    const byteB = parseInt(b.slice(i, i + 2), 16);
    // NaN（非法 hex）参与 XOR 会变 0，先标记非法字符
    diff |= (byteA ^ byteB) | (Number.isNaN(byteA) || Number.isNaN(byteB) ? 1 : 0);
  }
  return diff === 0;
}

// ★校验密码（登录时调用）
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return timingSafeEqualHex(hashedInput, hash);
}
