// ============================================
// 照片上传 API（上传到 Supabase Storage）
// POST /api/upload
// GET /api/upload?test=1 — 诊断测试（检查 Supabase 连接）
// ============================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// 诊断端点：不需要登录，检查 Supabase Storage 连接状态
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("test") !== "1") {
    return NextResponse.json({ error: "请使用 POST 上传文件" }, { status: 405 });
  }

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    host: request.headers.get("host"),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
    },
  };

  try {
    const supabase = getSupabase();
    // 尝试列出 photos 桶中的文件（最多1个），测试连接
    const { data, error } = await supabase.storage.from("photos").list("", {
      limit: 1,
    });
    diagnostics.supabaseStorage = {
      connected: !error,
      error: error ? { message: error.message, name: error.name } : null,
    };
  } catch (e: any) {
    diagnostics.supabaseStorage = {
      connected: false,
      error: { message: e?.message || String(e) },
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}

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
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from("photos")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "上传失败", detail: error.message, code: error.name },
        { status: 500 }
      );
    }

    // 获取公开访问 URL
    const { data: urlData } = supabase.storage
      .from("photos")
      .getPublicUrl(data.path);

    const url = urlData.publicUrl;

    return NextResponse.json({ url, fileName }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "上传失败", detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
