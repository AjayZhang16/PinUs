import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================
// GET /api/checkins?mapSpaceId=xxx
// 获取指定地图空间的打卡记录
// ============================================

export async function GET(request: Request) {
  try {
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
    const body = await request.json();
    const { title, content, longitude, latitude, address, photos, visitedAt, userId, mapSpaceId } = body;

    if (!title || !longitude || !latitude || !userId || !mapSpaceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
        visitedAt: visitedAt ? new Date(visitedAt) : new Date(),
        userId,
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
