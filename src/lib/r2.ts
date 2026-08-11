// R2 文件操作（r2.ts）
// R2：Cloudflare 的对象存储（文件仓库），存产品图片、视频、360°资源、备份文件
// 线上通过 Workers 环境绑定 env.YIQUANTEA_R2 访问；本地开发阶段上传功能先占位

// ★上传文件到 R2，返回公开访问 URL
export async function uploadToR2(
  key: string, // 文件在 R2 里的路径，如 "products/abc123.jpg"
  body: ArrayBuffer, // 文件内容（二进制）
  contentType: string, // 文件类型，如 "image/jpeg"
  r2: R2Bucket // R2 绑定实例
): Promise<string> {
  await r2.put(key, body, {
    httpMetadata: { contentType },
  });
  // 返回公开访问 URL（R2_PUBLIC_URL 在 .env / wrangler vars 中配置）
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

// 从 R2 删除文件（删除产品图片/视频/备份时调用）
export async function deleteFromR2(key: string, r2: R2Bucket): Promise<void> {
  await r2.delete(key);
}

// 读取 R2 文件内容（下载备份文件时调用）
export async function getFromR2(key: string, r2: R2Bucket): Promise<ArrayBuffer | null> {
  const object = await r2.get(key);
  if (!object) return null;
  return object.arrayBuffer();
}
