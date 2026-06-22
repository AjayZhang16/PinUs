"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  X,
  MapPin,
  GripVertical,
} from "lucide-react";

export interface RoutePointItem {
  id: string;
  label?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  sortOrder: number;
}

export interface TravelRouteItem {
  id: string;
  name: string;
  color: string;
  shareCode: string;
  points: RoutePointItem[];
  user: { id: string; name: string };
}

export interface DraftRoutePoint {
  id: string;
  longitude: number;
  latitude: number;
  label?: string;
}

interface RoutePanelProps {
  routes: TravelRouteItem[];
  isLoading: boolean;
  currentUserId?: string;
  selectedRouteId: string | null;
  planningMode: boolean;
  draftPoints: DraftRoutePoint[];
  isSaving: boolean;
  onSelectRoute: (id: string | null) => void;
  onStartPlanning: () => void;
  onCancelPlanning: () => void;
  onRemoveDraftPoint: (id: string) => void;
  onSaveRoute: (name: string) => void;
  onDeleteRoute: (id: string) => void;
  onShowImport: () => void;
}

function pointRoleLabel(index: number, total: number) {
  if (index === 0) return "起点";
  if (index === total - 1) return "终点";
  return `途径 ${index}`;
}

export default function RoutePanel({
  routes,
  isLoading,
  currentUserId,
  selectedRouteId,
  planningMode,
  draftPoints,
  isSaving,
  onSelectRoute,
  onStartPlanning,
  onCancelPlanning,
  onRemoveDraftPoint,
  onSaveRoute,
  onDeleteRoute,
  onShowImport,
}: RoutePanelProps) {
  const [routeName, setRouteName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyShareCode = async (route: TravelRouteItem) => {
    try {
      await navigator.clipboard.writeText(route.shareCode);
      setCopiedId(route.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("复制失败");
    }
  };

  const handleSave = () => {
    if (!routeName.trim()) {
      alert("请输入路线名称");
      return;
    }
    onSaveRoute(routeName.trim());
    setRouteName("");
  };

  if (planningMode) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
          <p className="font-medium mb-1">📍 规划路线中</p>
          <p className="text-xs text-violet-600">
            点击地图添加途径点，至少需要起点和终点（2 个点）
          </p>
        </div>

        {draftPoints.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            在地图上点击添加第一个点
          </div>
        ) : (
          <div className="space-y-2">
            {draftPoints.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border bg-card p-2 text-sm"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0 ${
                    i === 0
                      ? "bg-green-500"
                      : i === draftPoints.length - 1
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }`}
                >
                  {i === 0 ? "起" : i === draftPoints.length - 1 ? "终" : i}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs text-muted-foreground">
                    {pointRoleLabel(i, draftPoints.length)}
                  </p>
                  <p className="truncate text-xs">
                    {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => onRemoveDraftPoint(p.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Input
          placeholder="路线名称，如：五一云南之旅"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          maxLength={50}
        />

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancelPlanning}>
            取消
          </Button>
          <Button
            className="flex-1"
            disabled={draftPoints.length < 2 || isSaving || !routeName.trim()}
            onClick={handleSave}
          >
            {isSaving ? "保存中..." : "保存路线"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button className="flex-1 gap-1.5 text-sm" size="sm" onClick={onStartPlanning}>
          <Plus className="h-4 w-4" />
          新建路线
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-1.5 text-sm"
          size="sm"
          onClick={onShowImport}
        >
          <Download className="h-4 w-4" />
          导入
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-8">加载中...</div>
      ) : routes.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          <div className="text-3xl mb-2">🛤️</div>
          还没有路线
          <br />
          点击「新建路线」开始规划
        </div>
      ) : (
        routes.map((route) => (
          <Card
            key={route.id}
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              selectedRouteId === route.id ? "ring-2 ring-violet-500 shadow-md" : ""
            }`}
            onClick={() =>
              onSelectRoute(selectedRouteId === route.id ? null : route.id)
            }
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div
                  className="mt-0.5 h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: route.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{route.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {route.points.length} 个点 · {route.user.name}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <code className="truncate font-mono">
                      {route.shareCode.slice(0, 10)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyShareCode(route);
                      }}
                      title="复制分享码"
                    >
                      {copiedId === route.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                {route.user.id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定删除路线「${route.name}」吗？`)) {
                        onDeleteRoute(route.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
