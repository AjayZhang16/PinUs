// ============================================
// 打卡 API 路由（带认证）
// GET    /api/checkins?mapSpaceId=xxx  — 获取打卡列表
// POST   /api/checkins                 — 创建打卡
// DELETE /api/checkins?id=xxx          — 删除打卡
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ============================================
// GET /api/checkins?mapSpaceId=xxx
// 获取指定地图空间的打卡记录
// ============================================

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mapSpaceId = searchParams.get("mapSpaceId");

    if (!mapSpaceId) {
      return NextResponse.json(
        { error: "mapSpaceId is required" },
        { status: 400 }
      );
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { mapSpaceId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { visitedAt: "desc" },
    });

    return NextResponse.json(checkIns);
  } catch (error) {
    console.error("Failed to fetch check-ins:", error);
    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/checkins
// 创建新打卡记录
// ============================================

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, longitude, latitude, address, photos, visitedAt, mapSpaceId, companions, color } = body;

    if (!title || longitude === undefined || latitude === undefined || !mapSpaceId) {
      return NextResponse.json(
        { error: "标题、经纬度和地图空间不能为空" },
        { status: 400 }
      );
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        title,
        content: content || null,
        longitude: parseFloat(String(longitude)),
        latitude: parseFloat(String(latitude)),
        address: address || null,
        photos: photos || [],
        companions: companions && companions.length > 0 ? JSON.stringify(companions) : null,
        color: color || "#3b82f6",
        visitedAt: visitedAt ? new Date(visitedAt) : new Date(),
        userId: user.userId,
        mapSpaceId,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(checkIn, { status: 201 });
  } catch (error) {
    console.error("Failed to create check-in:", error);
    return NextResponse.json(
      { error: "Failed to create check-in" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/checkins?id=xxx
// 删除打卡记录（只能删自己的）
// ============================================

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少打卡ID" }, { status: 400 });
    }

    // 检查是否是打卡的作者
    const checkIn = await prisma.checkIn.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!checkIn) {
      return NextResponse.json({ error: "打卡记录不存在" }, { status: 404 });
    }

    if (checkIn.userId !== user.userId) {
      return NextResponse.json({ error: "只能删除自己的打卡" }, { status: 403 });
    }

    await prisma.checkIn.delete({ where: { id } });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Failed to delete check-in:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
