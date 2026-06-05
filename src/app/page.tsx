"use client";

import { useState, useCallback } from "react";
import PinUsMap from "@/components/map";
import CheckInForm, { CheckInFormData } from "@/components/checkin/CheckInForm";
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
} from "lucide-react";

// ============================================
// 演示数据（后续对接数据库后替换）
// ============================================

const DEMO_USER = {
  id: "demo-user-1",
  name: "旅行者",
  avatarUrl: null,
};

const DEMO_MAP_SPACE = {
  id: "demo-map-1",
  name: "我们的足迹",
  description: "记录每一次出行的地图",
  inviteCode: "pinus-demo",
  memberCount: 5,
  checkInCount: 12,
};

const DEMO_CHECKINS = [
  {
    id: "1",
    title: "长城之行",
    content: "不到长城非好汉！秋天的长城格外壮观 🏔️",
    longitude: 116.5704,
    latitude: 40.4319,
    address: "八达岭长城",
    userName: "旅行者",
    photos: [],
    visitedAt: "2026-05-20",
  },
  {
    id: "2",
    title: "西湖漫步",
    content: "苏堤春晓，柳絮纷飞 🌸",
    longitude: 120.1487,
    latitude: 30.2422,
    address: "杭州西湖",
    userName: "小明",
    photos: [],
    visitedAt: "2026-04-15",
  },
  {
    id: "3",
    title: "成都火锅",
    content: "来成都怎么能不吃火锅！ 🔥",
    longitude: 104.0665,
    latitude: 30.5728,
    address: "宽窄巷子",
    userName: "小红",
    photos: [],
    visitedAt: "2026-03-28",
  },
  {
    id: "4",
    title: "外滩夜景",
    content: "灯火辉煌的上海外滩 ✨",
    longitude: 121.4903,
    latitude: 31.2363,
    address: "上海外滩",
    userName: "旅行者",
    photos: [],
    visitedAt: "2026-02-14",
  },
  {
    id: "5",
    title: "丽江古城",
    content: "小桥流水人家 🏘️",
    longitude: 100.2335,
    latitude: 26.8721,
    address: "丽江古城",
    userName: "小华",
    photos: [],
    visitedAt: "2026-01-05",
  },
];

// ============================================
// 主页面
// ============================================

export default function HomePage() {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [clickLocation, setClickLocation] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "members">("timeline");

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  // 点击地图创建打卡
  const handleMapClick = useCallback((lng: number, lat: number) => {
    setClickLocation({ lng, lat });
    setShowCheckIn(true);
  }, []);

  // 提交打卡
  const handleCheckInSubmit = useCallback(async (data: CheckInFormData) => {
    // TODO: 对接 API
    console.log("Check-in data:", data);
    setShowCheckIn(false);
    setClickLocation(null);
  }, []);

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

        {/* 当前地图信息 */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{DEMO_MAP_SPACE.name}</h2>
            <Badge variant="secondary" className="text-xs">
              {DEMO_MAP_SPACE.checkInCount} 次打卡
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {DEMO_MAP_SPACE.description}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {DEMO_MAP_SPACE.memberCount} 成员
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {DEMO_MAP_SPACE.checkInCount} 打卡
            </span>
          </div>
        </div>

        {/* 标签页切换 */}
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

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "timeline" ? (
            <div className="space-y-3">
              {DEMO_CHECKINS.map((checkin) => (
                <Card key={checkin.id} className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-xs">
                          {checkin.userName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {checkin.title}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {checkin.userName} · {checkin.address}
                        </p>
                        {checkin.content && (
                          <p className="mt-1 text-sm text-foreground/80 line-clamp-2">
                            {checkin.content}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {checkin.visitedAt}
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
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {["旅行者", "小明", "小红", "小华", "小刚"].map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 text-sm">
                      {name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(Math.random() * 10) + 1} 次打卡
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="border-t p-4 space-y-2">
          <Button className="w-full gap-2" onClick={() => {
            // 获取当前位置作为默认值
            setClickLocation({ lng: 116.3974, lat: 39.9087 }); // 默认北京
            setShowCheckIn(true);
          }}>
            <Plus className="h-4 w-4" />
            打卡
          </Button>
          <Button variant="outline" className="w-full gap-2" size="sm">
            <LogIn className="h-3.5 w-3.5" />
            通过邀请码加入
          </Button>
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
          🗺️ 点击地图任意位置即可打卡
        </div>

        {/* Mapbox 地图 */}
        {mapboxToken ? (
          <PinUsMap
            mapboxToken={mapboxToken}
            markers={DEMO_CHECKINS.map((c) => ({
              id: c.id,
              longitude: c.longitude,
              latitude: c.latitude,
              title: c.title,
              content: c.content,
              userName: c.userName,
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
                      href="https://account.mapbox.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      Mapbox 官网
                    </a>{" "}
                    注册并获取 Access Token
                  </li>
                  <li>
                    2. 在项目根目录的 <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.env</code> 文件中设置：
                  </li>
                  <li className="rounded bg-gray-50 p-2 font-mono text-xs">
                    NEXT_PUBLIC_MAPBOX_TOKEN=你的Token
                  </li>
                  <li>3. 重新启动开发服务器</li>
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
        />
      )}
    </div>
  );
}
