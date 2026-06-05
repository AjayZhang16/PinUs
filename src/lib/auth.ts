// ============================================
// 认证工具：JWT + 密码哈希 + 中间件
// ============================================

import { cookies } from "next/headers";

// JWT 密钥（从环境变量读取，开发时用默认值）
const JWT_SECRET = process.env.JWT_SECRET || "pinus-dev-secret-change-in-production";

// ============================================
// 密码哈希（Web Crypto API，不需要 bcryptjs 依赖）
// ============================================

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // 加盐：用随机 salt 增强安全性
  const salt = crypto.randomUUID().slice(0, 16);
  const saltedPassword = salt + password;
  const saltedData = encoder.encode(saltedPassword);
  const saltedHash = await crypto.subtle.digest("SHA-256", saltedData);
  const saltedHashArray = Array.from(new Uint8Array(saltedHash));
  const hashHex = saltedHashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [salt, hashHex] = storedHash.split(":");
  const saltedPassword = salt + password;
  const saltedData = encoder.encode(saltedPassword);
  const saltedHash = await crypto.subtle.digest("SHA-256", saltedData);
  const saltedHashArray = Array.from(new Uint8Array(saltedHash));
  const computedHash = saltedHashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return computedHash === hashHex;
}

// ============================================
// JWT Token（简易实现，不需要 jsonwebtoken 依赖）
// ============================================

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return atob(base64);
}

async function signJWT(payload: JWTPayload): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 }; // 7 天过期

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  const encodedSignature = base64UrlEncode(
    Array.from(new Uint8Array(signature))
      .map((b) => String.fromCharCode(b))
      .join("")
  );

  return `${signingInput}.${encodedSignature}`;
}

async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureStr = base64UrlDecode(encodedSignature);
    const signatureArray = new Uint8Array(signatureStr.length);
    for (let i = 0; i < signatureStr.length; i++) {
      signatureArray[i] = signatureStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureArray,
      new TextEncoder().encode(signingInput)
    );

    if (!isValid) return null;

    const claims = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) return null;

    return { userId: claims.userId, email: claims.email, name: claims.name };
  } catch {
    return null;
  }
}

// ============================================
// Cookie 操作
// ============================================

const TOKEN_COOKIE_NAME = "pinus_token";

async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 天
    path: "/",
  });
}

async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

// ============================================
// 获取当前用户（从 cookie 中解析 JWT）
// ============================================

async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyJWT(token);
  } catch {
    return null;
  }
}

// ============================================
// 导出
// ============================================

export {
  hashPassword,
  verifyPassword,
  signJWT,
  verifyJWT,
  setAuthCookie,
  removeAuthCookie,
  getCurrentUser,
};

export type { JWTPayload };
