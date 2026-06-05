import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================
// POST /api/mapspaces/join
// 通过邀请码加入地图空间
// ============================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inviteCode, userId } = body;

    if (!inviteCode || !userId) {
      return NextResponse.json(
        { error: "inviteCode and userId are required" },
        { status: 400 }
      );
    }

    // 查找地图空间
    const mapSpace = await prisma.mapSpace.findUnique({
      where: { inviteCode },
    });

    if (!mapSpace) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      );
    }

    // 检查是否已经是成员
    const existingMember = await prisma.mapMember.findUnique({
      where: {
        userId_mapSpaceId: {
          userId,
          mapSpaceId: mapSpace.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "Already a member", mapSpace },
        { status: 200 }
      );
    }

    // 加入地图空间
    await prisma.mapMember.create({
      data: {
        userId,
        mapSpaceId: mapSpace.id,
        role: "member",
      },
    });

    return NextResponse.json(
      { message: "Joined successfully", mapSpace },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to join map space:", error);
    return NextResponse.json(
      { error: "Failed to join map space" },
      { status: 500 }
    );
  }
}
