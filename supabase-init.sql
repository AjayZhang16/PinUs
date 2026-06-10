-- PinUs 数据库建表 SQL
-- 在 Supabase SQL Editor 中执行

-- 用户表
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 地图空间表
CREATE TABLE IF NOT EXISTS "map_spaces" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "inviteCode" TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 地图成员关系表
CREATE TABLE IF NOT EXISTS "map_members" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "role" TEXT NOT NULL DEFAULT 'member',
    "user_id" TEXT NOT NULL,
    "map_space_id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "map_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "map_members_map_space_id_fkey" FOREIGN KEY ("map_space_id") REFERENCES "map_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "map_members_userid_mapspaceid_unique" UNIQUE ("user_id", "map_space_id")
);

-- 打卡记录表
CREATE TABLE IF NOT EXISTS "check_ins" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companions" TEXT,
    "color" TEXT DEFAULT '#3b82f6',
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "map_space_id" TEXT NOT NULL,
    CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "check_ins_map_space_id_fkey" FOREIGN KEY ("map_space_id") REFERENCES "map_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 地图空间外键
ALTER TABLE "map_spaces" ADD CONSTRAINT "map_spaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 索引
CREATE INDEX IF NOT EXISTS "map_spaces_owner_id_idx" ON "map_spaces"("owner_id");
CREATE INDEX IF NOT EXISTS "map_members_user_id_idx" ON "map_members"("user_id");
CREATE INDEX IF NOT EXISTS "map_members_map_space_id_idx" ON "map_members"("map_space_id");
CREATE INDEX IF NOT EXISTS "check_ins_user_id_idx" ON "check_ins"("user_id");
CREATE INDEX IF NOT EXISTS "check_ins_map_space_id_idx" ON "check_ins"("map_space_id");
