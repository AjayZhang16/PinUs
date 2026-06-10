"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import PinUsMap from "@/components/map";
import CheckInForm, { CheckInFormData } from "@/components/checkin/CheckInForm";
import AuthDialog from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Plus,
  Calendar,
  Image as ImageIcon,
  Menu,
  X,
  LogIn,
  LogOut,
  Copy,
  Check,
  ChevronDown,
  UserPlus,
  Trash2,
  Users,
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

interface MapSpaceItem {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  isPublic: boolean;
  owner: { id: string; name: string; avatarUrl?: string | null };
  members: {
    userId: string;
    role: string;
    user: { id: string; name: string; avatarUrl?: string | null };
  }[];
  _count: { checkIns: number; members: number };
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "members">(
    "timeline"
  );

  // 数据状态
  const [checkIns, setCheckIns] = useState<CheckInItem[]>([]);
  const [mapSpaces, setMapSpaces] = useState<MapSpaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 空间切换下拉
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false);
  const spaceDropdownRef = useRef<HTMLDivElement>(null);

  // 加入地图
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  // 复制邀请码
  const [copied, setCopied] = useState(false);

  // 删除打卡
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || "";
  const amapSecurityKey = process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY || "";

  // 当前空间
  const currentSpace = mapSpaces.find((s) => s.id === mapSpaceId);

  // ============================================
  // 初始化
  // ============================================

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (mapSpaceId) {
      loadCheckIns();
    }
  }, [mapSpaceId]);

  // 桌面端默认展开侧边栏
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setSidebarOpen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 点击外部关闭空间下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        spaceDropdownRef.current &&
        !spaceDropdownRef.current.contains(e.target as Node)
      ) {
        setSpaceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ============================================
  // 数据加载
  // ============================================

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        const spaceRes = await fetch(`/api/mapspaces?userId=${data.user.id}`);
        const spaces = await spaceRes.json();
        setMapSpaces(spaces);
        if (spaces.length > 0) {
          setMapSpaceId(spaces[0].id);
        }
      }
    } catch {
      // 未登录
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

  const loadMapSpaces = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/mapspaces?userId=${user.id}`);
      if (res.ok) {
        const spaces = await res.json();
        setMapSpaces(spaces);
      }
    } catch {
      // ignore
    }
  };

  // ============================================
  // 认证处理
  // ============================================

  const handleAuthSuccess = (loggedInUser: User, spaceId: string) => {
    setUser(loggedInUser);
    setMapSpaceId(spaceId);
    setShowAuth(false);
    loadMapSpaces();
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
    setMapSpaces([]);
  };

  // ============================================
  // 打卡处理
  // ============================================

  const handleMapClick = useCallback(
    (lng: number, lat: number) => {
      if (!user) {
        setShowAuth(true);
        return;
      }
      setClickLocation({ lng, lat });
      setShowCheckIn(true);
    },
    [user]
  );

  const handleCheckInSubmit = useCallback(
    async (data: CheckInFormData) => {
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
    },
    [mapSpaceId]
  );

  // ============================================
  // 删除打卡
  // ============================================

  const handleDeleteCheckIn = async (id: string) => {
    if (!confirm("确定要删除这条打卡吗？")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/checkins?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setCheckIns((prev) => prev.filter((c) => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================
  // 加入地图
  // ============================================

  const handleJoinMap = async () => {
    if (!joinCode.trim() || !user) return;
    setJoinLoading(true);
    setJoinError("");
    try {
      const res = await fetch("/api/mapspaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode.trim(), userId: user.id }),
      });
      const data = await res.json();

      if (res.ok || res.status === 200) {
        // 刷新空间列表
        await loadMapSpaces();
        // 如果是新加入的空间，切换过去
        if (data.mapSpace && res.status === 201) {
          setMapSpaceId(data.mapSpace.id);
        }
        setJoinCode("");
        setShowJoinInput(false);
      } else {
        setJoinError(data.error || "加入失败");
      }
    } catch {
      setJoinError("网络错误");
    } finally {
      setJoinLoading(false);
    }
  };

  // ============================================
  // 复制邀请码
  // ============================================

  const handleCopyInviteCode = async () => {
    if (!currentSpace) return;
    try {
      await navigator.clipboard.writeText(currentSpace.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = currentSpace.inviteCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ============================================
  // 侧边栏内容（桌面 & 移动端共用）
  // ============================================

  const sidebarContent = (
    <>
      {/* 品牌头部 */}
      <div className="flex items-center gap-3 border-b p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-xl">
          📍
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">PinUs</h1>
          <p className="text-xs text-muted-foreground">把我们钉在地图上</p>
        </div>
        {/* 移动端关闭按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 空间切换 */}
      {user && mapSpaces.length > 0 && (
        <div className="border-b p-3" ref={spaceDropdownRef}>
          <div className="relative">
            <button
              onClick={() => setSpaceDropdownOpen(!spaceDropdownOpen)}
              className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <MapPin className="h-4 w-4 flex-shrink-0 text-blue-500" />
              <span className="flex-1 truncate font-medium">
                {currentSpace?.name || "选择地图"}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  spaceDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {spaceDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border bg-popover p-1 shadow-lg">
                {mapSpaces.map((space) => (
                  <button
                    key={space.id}
                    onClick={() => {
                      setMapSpaceId(space.id);
                      setSpaceDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      space.id === mapSpaceId
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-muted"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{space.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {space._count.members}人
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 用户信息 / 登录按钮 */}
      <div className="border-b p-4">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-blue-100 text-sm">
                  {user.name[0]}
                </AvatarFallback>
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="登出"
              className="flex-shrink-0"
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

      {/* 邀请码 */}
      {user && currentSpace && (
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>邀请码:</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-foreground">
              {currentSpace.inviteCode.slice(0, 8)}...
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopyInviteCode}
              title="复制邀请码"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 打卡统计 */}
      {user && mapSpaceId && (
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">我的足迹</h2>
            <Badge variant="secondary" className="text-xs">
              {checkIns.length} 次打卡
            </Badge>
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
                  <Card
                    key={checkin.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-blue-100 text-xs">
                            {checkin.user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">
                              {checkin.title}
                            </span>
                            {/* 删除按钮（仅自己的打卡） */}
                            {checkin.user.id === user.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0 opacity-60 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCheckIn(checkin.id);
                                }}
                                disabled={deletingId === checkin.id}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            )}
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
                            {new Date(checkin.visitedAt).toLocaleString(
                              "zh-CN",
                              {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
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
            /* 成员列表 */
            <div className="space-y-2">
              {currentSpace?.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 text-sm">
                      {member.user.name[0]}
                    </AvatarFallback>
                    {member.user.avatarUrl && (
                      <AvatarImage src={member.user.avatarUrl} />
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.role === "owner"
                        ? "地图主人"
                        : member.role === "admin"
                        ? "管理员"
                        : "成员"}
                    </p>
                  </div>
                </div>
              ))}
              {currentSpace && currentSpace.members.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  暂无成员
                </div>
              )}
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
      <div className="border-t p-3 space-y-2">
        {/* 加入地图 */}
        {user && (
          <>
            {showJoinInput ? (
              <div className="flex gap-2">
                <Input
                  placeholder="输入邀请码"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinMap()}
                  className="text-sm h-9"
                />
                <Button
                  size="sm"
                  onClick={handleJoinMap}
                  disabled={joinLoading || !joinCode.trim()}
                  className="flex-shrink-0"
                >
                  {joinLoading ? "..." : "加入"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={() => setShowJoinInput(true)}
              >
                <UserPlus className="h-4 w-4" />
                加入地图
              </Button>
            )}
            {joinError && (
              <p className="text-xs text-red-500 text-center">{joinError}</p>
            )}
          </>
        )}

        {/* 打卡按钮 */}
        {user && mapSpaceId && (
          <Button
            className="w-full gap-2"
            onClick={() => {
              setClickLocation({ lng: 116.3974, lat: 39.9087 });
              setShowCheckIn(true);
              // 移动端关闭侧边栏
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
          >
            <Plus className="h-4 w-4" />
            打卡
          </Button>
        )}
      </div>
    </>
  );

  // ============================================
  // 渲染
  // ============================================

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-background">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          flex flex-col bg-card border-r
          fixed inset-y-0 left-0 z-50 w-80
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:z-auto
          md:translate-x-0
          ${sidebarOpen ? "md:w-80" : "md:w-0 md:overflow-hidden md:border-r-0"}
          md:transition-[width] md:duration-300 md:ease-in-out
        `}
      >
        {sidebarContent}
      </aside>

      {/* 地图主区域 */}
      <main className="relative flex-1 min-w-0">
        {/* 侧边栏切换按钮（桌面端） */}
        <Button
          variant="outline"
          size="icon"
          className="hidden md:flex absolute left-4 top-4 z-10 shadow-md bg-white/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>

        {/* 移动端汉堡按钮（侧边栏关闭时显示） */}
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            className="md:hidden absolute left-4 top-4 z-10 shadow-md bg-white/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* 地图提示 */}
        <div className="absolute bottom-24 md:bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm whitespace-nowrap">
          {user
            ? "🗺️ 点击地图任意位置即可打卡"
            : "🗺️ 登录后点击地图即可打卡"}
        </div>

        {/* 移动端浮动打卡按钮 */}
        {user && mapSpaceId && (
          <div className="md:hidden absolute bottom-6 right-6 z-10">
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-xl bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => {
                setClickLocation({ lng: 116.3974, lat: 39.9087 });
                setShowCheckIn(true);
              }}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}

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
              <h2 className="mb-2 text-2xl font-bold text-gray-800">PinUs</h2>
              <p className="mb-6 text-gray-600">把我们钉在地图上</p>
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
                    注册并创建应用
                  </li>
                  <li>
                    2. 添加 Key，服务平台选{" "}
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                      Web端(JS API)
                    </code>
                  </li>
                  <li>
                    3. 在 <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.env</code> 中设置：
                  </li>
                  <li className="rounded bg-gray-50 p-2 font-mono text-xs">
                    NEXT_PUBLIC_AMAP_KEY=你的Key
                    <br />
                    NEXT_PUBLIC_AMAP_SECURITY_KEY=你的安全密钥
                  </li>
                  <li>4. 重新启动开发服务器</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 打卡对话框 */}
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

      {/* 登录/注册对话框 */}
      <AuthDialog
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
