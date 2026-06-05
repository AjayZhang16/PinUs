// ============================================
// 认证 API 路由：注册 + 登录 + 登出 + 获取当前用户
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  signJWT,
  setAuthCookie,
  removeAuthCookie,
  getCurrentUser,
} from "@/lib/auth";

// ============================================
// POST /api/auth/register
// 注册新用户
// ============================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 根据 action 分发不同的认证操作
    switch (action) {
      case "register":
        return await handleRegister(body);
      case "login":
        return await handleLogin(body);
      case "logout":
        return await handleLogout();
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================
// GET /api/auth
// 获取当前登录用户信息
// ============================================

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }

    // 从数据库获取最新用户信息
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, name: true, email: true, avatarUrl: true, bio: true },
    });

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ user: null });
  }
}

// ============================================
// 注册处理
// ============================================

async function handleRegister(body: {
  name: string;
  email: string;
  password: string;
}) {
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "姓名、邮箱和密码都不能为空" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "密码至少 6 位" },
      { status: 400 }
    );
  }

  // 检查邮箱是否已注册
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "该邮箱已被注册" },
      { status: 409 }
    );
  }

  // 哈希密码
  const hashedPassword = await hashPassword(password);

  // 创建用户
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  // 自动创建一个默认地图空间（让用户可以立即打卡）
  const defaultMapSpace = await prisma.mapSpace.create({
    data: {
      name: `${name}的足迹`,
      description: "我的打卡地图",
      isPublic: false,
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: "owner" },
      },
    },
  });

  // 生成 JWT
  const token = await signJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  // 设置 Cookie
  await setAuthCookie(token);

  return NextResponse.json({
    user,
    mapSpaceId: defaultMapSpace.id,
  }, { status: 201 });
}

// ============================================
// 登录处理
// ============================================

async function handleLogin(body: { email: string; password: string }) {
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "邮箱和密码不能为空" },
      { status: 400 }
    );
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json(
      { error: "邮箱或密码错误" },
      { status: 401 }
    );
  }

  // 验证密码
  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    return NextResponse.json(
      { error: "邮箱或密码错误" },
      { status: 401 }
    );
  }

  // 生成 JWT
  const token = await signJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  // 设置 Cookie
  await setAuthCookie(token);

  // 获取用户关联的第一个地图空间
  const firstMapSpace = await prisma.mapSpace.findFirst({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
    mapSpaceId: firstMapSpace?.id || null,
  });
}

// ============================================
// 登出处理
// ============================================

async function handleLogout() {
  await removeAuthCookie();
  return NextResponse.json({ message: "已登出" });
}
