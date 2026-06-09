// ============================================
// Supabase 客户端（服务端用，带 Service Role Key）
// 用于上传照片到 Supabase Storage
// ============================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 服务端客户端（用 anon key，配合 RLS 策略）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
