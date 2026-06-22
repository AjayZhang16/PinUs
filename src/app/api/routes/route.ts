// ============================================
// 旅游路线 API
// GET    /api/routes?mapSpaceId=xxx  — 列表
// POST   /api/routes                 — 创建
// PATCH  /api/routes?id=xxx          — 更新
// DELETE /api/routes?id=xxx          — 删除
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mapSpaceId = searchParams.get("mapSpaceId");
    if (!mapSpaceId) {
      return NextResponse.json({ error: "mapSpaceId is required" }, { status: 400 });
    }

    const routes = await prisma.travelRoute.findMany({
      where: { mapSpaceId },
      include: routeInclude,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error("Failed to fetch routes:", error);
    return NextResponse.json({ error: "获取路线失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { name, mapSpaceId, color, points } = body as {
      name: string;
      mapSpaceId: string;
      color?: string;
      points: { label?: string; latitude: number; longitude: number; address?: string }[];
    };

    if (!name?.trim() || !mapSpaceId) {
      return NextResponse.json({ error: "路线名称和地图空间不能为空" }, { status: 400 });
    }
    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: "路线至少需要起点和终点（2 个点）" }, { status: 400 });
    }

    const route = await prisma.travelRoute.create({
      data: {
        name: name.trim(),
        color: color || "#8b5cf6",
        userId: user.userId,
        mapSpaceId,
        points: {
          create: points.map((p, i) => ({
            label: p.label?.trim() || null,
            latitude: p.latitude,
            longitude: p.longitude,
            address: p.address?.trim() || null,
            sortOrder: i,
          })),
        },
      },
      include: routeInclude,
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error("Failed to create route:", error);
    return NextResponse.json({ error: "创建路线失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少路线 ID" }, { status: 400 });
    }

    const existing = await prisma.travelRoute.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "路线不存在" }, { status: 404 });
    }
    if (existing.userId !== user.userId) {
      return NextResponse.json({ error: "只能编辑自己的路线" }, { status: 403 });
    }

    const body = await request.json();
    const { name, color, points } = body as {
      name?: string;
      color?: string;
      points?: { label?: string; latitude: number; longitude: number; address?: string }[];
    };

    if (points && points.length < 2) {
      return NextResponse.json({ error: "路线至少需要 2 个点" }, { status: 400 });
    }

    const route = await prisma.$transaction(async (tx) => {
      if (points) {
        await tx.routePoint.deleteMany({ where: { routeId: id } });
        await tx.routePoint.createMany({
          data: points.map((p, i) => ({
            routeId: id,
            label: p.label?.trim() || null,
            latitude: p.latitude,
            longitude: p.longitude,
            address: p.address?.trim() || null,
            sortOrder: i,
          })),
        });
      }

      return tx.travelRoute.update({
        where: { id },
        data: {
          ...(name?.trim() ? { name: name.trim() } : {}),
          ...(color ? { color } : {}),
        },
        include: routeInclude,
      });
    });

    return NextResponse.json(route);
  } catch (error) {
    console.error("Failed to update route:", error);
    return NextResponse.json({ error: "更新路线失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少路线 ID" }, { status: 400 });
    }

    const existing = await prisma.travelRoute.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "路线不存在" }, { status: 404 });
    }
    if (existing.userId !== user.userId) {
      return NextResponse.json({ error: "只能删除自己的路线" }, { status: 403 });
    }

    await prisma.travelRoute.delete({ where: { id } });
    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Failed to delete route:", error);
    return NextResponse.json({ error: "删除路线失败" }, { status: 500 });
  }
}
