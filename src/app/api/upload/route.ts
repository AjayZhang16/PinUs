// ============================================
// 照片上传 API（上传到 Supabase Storage）
// POST /api/upload
// ============================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    // 限制文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小不能超过 5MB" }, { status: 400 });
    }

    // 限制文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "只支持 JPG、PNG、GIF、WebP 格式" }, { status: 400 });
    }

    // 生成唯一文件名（按用户分目录）
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomStr}.${ext}`;
    const filePath = `${user.userId}/${fileName}`; // 按用户 ID 分目录

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from("photos")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "上传失败" },
        { status: 500 }
      );
    }

    // 获取公开访问 URL
    const { data: urlData } = supabase.storage
      .from("photos")
      .getPublicUrl(data.path);

    const url = urlData.publicUrl;

    return NextResponse.json({ url, fileName }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "上传失败" },
      { status: 500 }
    );
  }
}
