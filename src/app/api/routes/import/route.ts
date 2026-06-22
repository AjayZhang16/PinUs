// ============================================
// 路线导入 / 预览
// GET  /api/routes/import?shareCode=xxx  — 预览路线
// POST /api/routes/import                — 导入到当前地图空间
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const routeInclude = {
  points: { orderBy: { sortOrder: "asc" as const } },
  user: { select: { id: true, name: true } },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareCode = searchParams.get("shareCode")?.trim();
    if (!shareCode) {
      return NextResponse.json({ error: "请提供分享码" }, { status: 400 });
    }

    const route = await prisma.travelRoute.findUnique({
      where: { shareCode },
      include: routeInclude,
    });

    if (!route) {
      return NextResponse.json({ error: "分享码无效或路线不存在" }, { status: 404 });
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error("Failed to preview route:", error);
    return NextResponse.json({ error: "预览路线失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { shareCode, mapSpaceId } = body as { shareCode: string; mapSpaceId: string };

    if (!shareCode?.trim() || !mapSpaceId) {
      return NextResponse.json({ error: "分享码和地图空间不能为空" }, { status: 400 });
    }

    const source = await prisma.travelRoute.findUnique({
      where: { shareCode: shareCode.trim() },
      include: { points: { orderBy: { sortOrder: "asc" } } },
    });

    if (!source) {
      return NextResponse.json({ error: "分享码无效或路线不存在" }, { status: 404 });
    }

    const route = await prisma.travelRoute.create({
      data: {
        name: `${source.name}（导入）`,
        description: source.description,
        color: source.color,
        userId: user.userId,
        mapSpaceId,
        points: {
          create: source.points.map((p) => ({
            label: p.label,
            latitude: p.latitude,
            longitude: p.longitude,
            address: p.address,
            sortOrder: p.sortOrder,
          })),
        },
      },
      include: routeInclude,
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error("Failed to import route:", error);
    return NextResponse.json({ error: "导入路线失败" }, { status: 500 });
  }
}
