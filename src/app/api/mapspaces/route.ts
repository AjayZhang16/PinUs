import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================
// GET /api/mapspaces
// 获取所有公开地图空间（或用户自己的）
// ============================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // 获取用户参与的地图空间
      const mapSpaces = await prisma.mapSpace.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, avatarUrl: true } },
          members: {
            select: {
              userId: true,
              role: true,
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          _count: { select: { checkIns: true, members: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      return NextResponse.json(mapSpaces);
    }

    // 获取公开地图空间
    const publicSpaces = await prisma.mapSpace.findMany({
      where: { isPublic: true },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { checkIns: true, members: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return NextResponse.json(publicSpaces);
  } catch (error) {
    console.error("Failed to fetch map spaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch map spaces" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/mapspaces
// 创建新地图空间
// ============================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, isPublic, ownerId } = body;

    if (!name || !ownerId) {
      return NextResponse.json(
        { error: "name and ownerId are required" },
        { status: 400 }
      );
    }

    const mapSpace = await prisma.mapSpace.create({
      data: {
        name,
        description: description || null,
        isPublic: isPublic ?? false,
        ownerId,
        members: {
          create: { userId: ownerId, role: "owner" },
        },
      },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        members: true,
      },
    });

    return NextResponse.json(mapSpace, { status: 201 });
  } catch (error) {
    console.error("Failed to create map space:", error);
    return NextResponse.json(
      { error: "Failed to create map space" },
      { status: 500 }
    );
  }
}
