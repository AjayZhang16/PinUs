// ============================================
// 域名统一重定向中间件
// 将 pin-us-p2gp.vercel.app 的访问统一重定向到 pinus-map.xyz
// 避免 Cookie 跨域问题（两个域名 Cookie 不共享，导致登录状态丢失）
// ============================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 需要重定向的旧域名
const LEGACY_HOSTNAMES = [
  "pin-us-p2gp.vercel.app",
  "www.pin-us-p2gp.vercel.app",
];

// 目标域名
const TARGET_HOST = "www.pinus-map.xyz";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // 如果请求来自旧域名，301 重定向到新域名（保留路径和查询参数）
  if (LEGACY_HOSTNAMES.some((h) => hostname === h || hostname.startsWith(h + ":"))) {
    const url = request.nextUrl.clone();
    url.hostname = TARGET_HOST;
    url.port = ""; // 清除端口（HTTPS 默认 443）
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

// 匹配所有路径（排除 _next/static 和 _next/image 等静态资源，避免不必要的中间件执行）
export const config = {
  matcher: [
    /*
     * 匹配所有路径，但排除：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
