"use client";

import { useState, useCallback, useEffect } from "react";
import PinUsMap from "@/components/map";
import CheckInForm, { CheckInFormData } from "@/components/checkin/CheckInForm";
import AuthDialog from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Plus,
  Users,
  Calendar,
  Image as ImageIcon,
  Menu,
  X,
  LogIn,
  LogOut,
} from "lucide-react";

// ============================================
// 类型定义
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface CheckInItem {
  id: string;
  title: string;
  content?: string | null;
  longitude: number;
  latitude: number;
  address?: string | null;
  photos: string[];
  visitedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

// ============================================
// 主页面
// ============================================

export default function HomePage() {
  // 认证状态
  const [user, setUser] = useState<User | null>(null);
  const [mapSpaceId, setMapSpaceId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // UI 状态
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [clickLocation, setClickLocation] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "members">("timeline");

  // 数据状态
  const [checkIns, setCheckIns] = useState<CheckInItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || "";
  const amapSecurityKey = process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY || "";

  // ============================================
  // 初始化：检查登录状态 + 加载打卡数据
  // ============================================

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (mapSpaceId) {
      loadCheckIns();
    }
  }, [mapSpaceId]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        // 获取用户的地图空间
        const spaceRes = await fetch(`/api/mapspaces?userId=${data.user.id}`);
        const spaces = await spaceRes.json();
        if (spaces.length > 0) {
          setMapSpaceId(spaces[0].id);
        }
      }
    } catch {
      // 未登录，忽略
    }
  };

  const loadCheckIns = async () => {
    if (!mapSpaceId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/checkins?mapSpaceId=${mapSpaceId}`);
      if (res.ok) {
        const data = await res.json();
        setCheckIns(data);
      }
    } catch (error) {
      console.error("Failed to load check-ins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // 认证处理
  // ============================================

  const handleAuthSuccess = (loggedInUser: User, spaceId: string) => {
    setUser(loggedInUser);
    setMapSpaceId(spaceId);
    setShowAuth(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // ignore
    }
    setUser(null);
    setMapSpaceId(null);
    setCheckIns([]);
  };

  // ============================================
  // 打卡处理
  // ============================================

  const handleMapClick = useCallback((lng: number, lat: number) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setClickLocation({ lng, lat });
    setShowCheckIn(true);
  }, [user]);

  const handleCheckInSubmit = useCallback(async (data: CheckInFormData) => {
    if (!mapSpaceId) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          mapSpaceId,
        }),
      });

      if (res.ok) {
        // 刷新打卡列表
        await loadCheckIns();
      } else {
        const error = await res.json();
        alert(error.error || "打卡失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setIsSubmitting(false);
      setShowCheckIn(false);
      setClickLocation(null);
    }
  }, [mapSpaceId]);

  // ============================================
  // 渲染
  // ============================================

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* ============================================ */}
      {/* 侧边栏 */}
      {/* ============================================ */}
      <aside
        className={`flex flex-col border-r bg-card transition-all duration-300 ${
          sidebarOpen ? "w-80" : "w-0 overflow-hidden"
        }`}
      >
        {/* 品牌头部 */}
        <div className="flex items-center gap-3 border-b p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-xl">
            📍
          </div>
          <div>
            <h1 className="text-lg font-bold">PinUs</h1>
            <p className="text-xs text-muted-foreground">
              把我们钉在地图上
            </p>
          </div>
        </div>

        {/* 用户信息 / 登录按钮 */}
        <div className="border-b p-4">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-blue-100 text-sm">
                    {user.name[0]}
                  </AvatarFallback>
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} />
                  )}
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="登出"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              className="w-full gap-2"
              onClick={() => setShowAuth(true)}
            >
              <LogIn className="h-4 w-4" />
              登录 / 注册
            </Button>
          )}
        </div>

        {/* 打卡统计 */}
        {user && mapSpaceId && (
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">我的足迹</h2>
              <Badge variant="secondary" className="text-xs">
                {checkIns.length} 次打卡
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {checkIns.length} 打卡
              </span>
            </div>
          </div>
        )}

        {/* 标签页切换 */}
        {user && mapSpaceId && (
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "timeline"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📋 时间线
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "members"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              👥 成员
            </button>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {user && mapSpaceId ? (
            activeTab === "timeline" ? (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    加载中...
                  </div>
                ) : checkIns.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    <div className="text-3xl mb-2">🗺️</div>
                    还没有打卡记录
                    <br />
                    点击地图开始你的第一次打卡！
                  </div>
                ) : (
                  checkIns.map((checkin) => (
                    <Card key={checkin.id} className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-xs">
                              {checkin.user.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {checkin.title}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {checkin.user.name}
                              {checkin.address ? ` · ${checkin.address}` : ""}
                            </p>
                            {checkin.content && (
                              <p className="mt-1 text-sm text-foreground/80 line-clamp-2">
                                {checkin.content}
                              </p>
                            )}
                            {/* 照片预览 */}
                            {checkin.photos.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {checkin.photos.slice(0, 3).map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`照片 ${i + 1}`}
                                    className="h-12 w-12 rounded object-cover"
                                  />
                                ))}
                                {checkin.photos.length > 3 && (
                                  <span className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                                    +{checkin.photos.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(checkin.visitedAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              {checkin.photos.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <ImageIcon className="h-3 w-3" />
                                  {checkin.photos.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg p-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 text-sm">
                      {user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">地图主人</p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              <div className="text-3xl mb-2">👋</div>
              登录后即可开始打卡
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="border-t p-4 space-y-2">
          {user && mapSpaceId && (
            <Button className="w-full gap-2" onClick={() => {
              setClickLocation({ lng: 116.3974, lat: 39.9087 });
              setShowCheckIn(true);
            }}>
              <Plus className="h-4 w-4" />
              打卡
            </Button>
          )}
        </div>
      </aside>

      {/* ============================================ */}
      {/* 地图主区域 */}
      {/* ============================================ */}
      <main className="relative flex-1">
        {/* 侧边栏切换按钮 */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-4 z-10 shadow-md"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        {/* 地图提示 */}
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
          {user
            ? "🗺️ 点击地图任意位置即可打卡"
            : "🗺️ 登录后点击地图即可打卡"}
        </div>

        {/* 高德地图 */}
        {amapKey ? (
          <PinUsMap
            amapKey={amapKey}
            amapSecurityKey={amapSecurityKey}
            markers={checkIns.map((c) => ({
              id: c.id,
              longitude: c.longitude,
              latitude: c.latitude,
              title: c.title,
              content: c.content || undefined,
              userName: c.user.name,
              photos: c.photos,
            }))}
            onMapClick={handleMapClick}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
              <div className="mb-4 text-6xl">📍</div>
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                PinUs
              </h2>
              <p className="mb-6 text-gray-600">
                把我们钉在地图上
              </p>
              <div className="mx-auto max-w-md rounded-xl bg-white p-6 text-left shadow-lg">
                <h3 className="mb-3 font-semibold text-gray-700">
                  🚀 快速开始
                </h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li>
                    1. 在{" "}
                    <a
                      href="https://lbs.amap.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      高德开放平台
                    </a>{" "}
                    注册并创建应用（手机号即可注册）
                  </li>
                  <li>
                    2. 添加 Key，服务平台选{" "}
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">Web端(JS API)</code>
                  </li>
                  <li>
                    3. 在项目根目录的 <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.env</code> 文件中设置：
                  </li>
                  <li className="rounded bg-gray-50 p-2 font-mono text-xs">
                    NEXT_PUBLIC_AMAP_KEY=你的Key<br/>
                    NEXT_PUBLIC_AMAP_SECURITY_KEY=你的安全密钥
                  </li>
                  <li>4. 重新启动开发服务器</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================ */}
      {/* 打卡对话框 */}
      {/* ============================================ */}
      {showCheckIn && clickLocation && (
        <CheckInForm
          longitude={clickLocation.lng}
          latitude={clickLocation.lat}
          onSubmit={handleCheckInSubmit}
          onCancel={() => {
            setShowCheckIn(false);
            setClickLocation(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* ============================================ */}
      {/* 登录/注册对话框 */}
      {/* ============================================ */}
      <AuthDialog
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
