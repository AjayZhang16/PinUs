"use client";

import { useEffect, useRef, useCallback } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";

// ============================================
// PinUs 地图组件
// 使用高德地图 JS API 2.0 + 中文标注
// 支持多 info card 同时显示
// ============================================

export type MapViewMode = "2D" | "3D";

const MAP_PITCH_3D = 50;

export interface MapRoutePoint {
  id: string;
  longitude: number;
  latitude: number;
  label?: string;
  sortOrder: number;
}

export interface MapRoute {
  id: string;
  name: string;
  color: string;
  points: MapRoutePoint[];
}

interface MapMarker {
  id: string;
  longitude: number;
  latitude: number;
  title: string;
  content?: string;
  userName?: string;
  photos?: string[];
  companions?: string[];
  color?: string;
}

interface PinUsMapProps {
  /** 高德地图 Key */
  amapKey: string;
  /** 高德地图安全密钥 */
  amapSecurityKey?: string;
  /** 地图上的标记点 */
  markers?: MapMarker[];
  /** 初始中心点 [经度, 纬度] */
  initialCenter?: [number, number];
  /** 初始缩放级别 */
  initialZoom?: number;
  /** 点击地图空白区域回调（用于创建打卡） */
  onMapClick?: (lng: number, lat: number) => void;
  /** 点击标记点回调 */
  onMarkerClick?: (marker: MapMarker) => void;
  /** 点击卡片回调（查看详情） */
  onCardClick?: (marker: MapMarker) => void;
  /** 外部触发地图飞到指定打卡点 */
  flyToTarget?: {
    id?: string;
    longitude: number;
    latitude: number;
    seq: number;
  } | null;
  /** 地图视图模式：2D 平面 / 3D 倾斜 */
  viewMode?: MapViewMode;
  /** 外部触发定位到当前位置 */
  locateTrigger?: { seq: number } | null;
  /** 定位进行中状态回调 */
  onLocateStatusChange?: (locating: boolean) => void;
  /** 已保存的旅游路线 */
  routes?: MapRoute[];
  /** 高亮显示的路线 ID */
  highlightedRouteId?: string | null;
  /** 规划中的路线草稿点 */
  draftRoutePoints?: MapRoutePoint[];
  /** 容器样式 */
  className?: string;
}

// AMap 类型声明
/* eslint-disable @typescript-eslint/no-explicit-any */
type AMapInstance = any;
type AMapMarkerInstance = any;

export default function PinUsMap({
  amapKey,
  amapSecurityKey,
  markers = [],
  initialCenter = [104.1954, 35.8617], // 中国中心
  initialZoom = 4,
  onMapClick,
  onMarkerClick,
  onCardClick,
  flyToTarget,
  viewMode = "2D",
  locateTrigger,
  onLocateStatusChange,
  routes = [],
  highlightedRouteId = null,
  draftRoutePoints = [],
  className = "",
}: PinUsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<AMapInstance | null>(null);
  const pinMarkersRef = useRef<AMapMarkerInstance[]>([]);
  const cardMarkersRef = useRef<Map<string, AMapMarkerInstance>>(new Map());
  const openCardsRef = useRef<Set<string>>(new Set());
  const routePolylinesRef = useRef<AMapMarkerInstance[]>([]);
  const routeMarkersRef = useRef<AMapMarkerInstance[]>([]);
  const draftPolylineRef = useRef<AMapMarkerInstance | null>(null);
  const draftMarkersRef = useRef<AMapMarkerInstance[]>([]);
  const AMapRef = useRef<any>(null);
  // 记录上一批 marker IDs，只在真正变化时才 setFitView
  const prevMarkerIdsRef = useRef<string>("");
  // 标记是否是首次加载（首次才自动 fitView）
  const isFirstFitRef = useRef(true);

  // 用 ref 保存最新的回调，避免闭包过期问题
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onCardClickRef = useRef(onCardClick);
  onCardClickRef.current = onCardClick;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const geolocationRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<AMapMarkerInstance | null>(null);
  const lastLocateSeqRef = useRef<number | null>(null);
  const onLocateStatusChangeRef = useRef(onLocateStatusChange);
  onLocateStatusChangeRef.current = onLocateStatusChange;

  // 地图始终以 3D 模式初始化，通过 pitch 切换平面/倾斜（避免 setViewMode 运行时切换崩溃）
  const applyViewMode = useCallback((mode: MapViewMode) => {
    if (!map.current) return;
    map.current.setPitch(mode === "3D" ? MAP_PITCH_3D : 0);
  }, []);

  const flyToLocation = useCallback(
    (lng: number, lat: number) => {
      if (!map.current) return;
      const targetZoom = Math.max(map.current.getZoom(), 15);
      map.current.setZoomAndCenter(targetZoom, [lng, lat], false, 500);
      setTimeout(() => applyViewMode(viewModeRef.current), 520);
    },
    [applyViewMode]
  );

  const showUserLocation = useCallback((lng: number, lat: number, AMap: any) => {
    if (!map.current) return;
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
    }
    userLocationMarkerRef.current = new AMap.CircleMarker({
      center: new AMap.LngLat(lng, lat),
      radius: 10,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      strokeOpacity: 1,
      fillColor: "#3b82f6",
      fillOpacity: 0.95,
      zIndex: 300,
    });
    userLocationMarkerRef.current.setMap(map.current);
  }, []);

  // 如果没有 key，显示提示界面
  if (!amapKey) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 rounded-xl ${className}`}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">需要配置高德地图 Key</h3>
          <p className="text-sm text-slate-500 mb-4">
            请在 <code className="bg-slate-200 px-1 py-0.5 rounded">.env</code> 文件中配置{' '}
            <code className="bg-slate-200 px-1 py-0.5 rounded">NEXT_PUBLIC_AMAP_KEY</code>
          </p>
          <a
            href="https://lbs.amap.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            获取高德地图 Key →
          </a>
        </div>
      </div>
    );
  }

// 转义 HTML 防止 XSS
function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getRoutePointRole(index: number, total: number): "start" | "end" | "waypoint" {
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "waypoint";
}

function getRoutePointColor(role: "start" | "end" | "waypoint"): string {
  if (role === "start") return "#22c55e";
  if (role === "end") return "#ef4444";
  return "#f59e0b";
}

function getRoutePointText(index: number, total: number): string {
  const role = getRoutePointRole(index, total);
  if (role === "start") return "起";
  if (role === "end") return "终";
  return String(index);
}

function createRoutePointMarker(
  AMap: any,
  lng: number,
  lat: number,
  text: string,
  color: string,
  zIndex: number
) {
  const el = document.createElement("div");
  el.className = "pinus-route-point";
  el.innerHTML = `<div class="route-point-badge" style="background:${color}">${escapeHtml(text)}</div>`;
  const marker = new AMap.Marker({
    position: new AMap.LngLat(lng, lat),
    content: el,
    anchor: "center",
    offset: new AMap.Pixel(0, 0),
    zIndex,
  });
  return marker;
}

  // 初始化地图
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // 设置安全密钥（AMap 2.0 要求）
    if (amapSecurityKey) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: amapSecurityKey,
      };
    }

    let isMounted = true;

    AMapLoader.load({
      key: amapKey,
      version: "2.0",
      plugins: [
        "AMap.Scale",        // 比例尺
        "AMap.ToolBar",      // 工具条
        "AMap.Geolocation",  // 定位
      ],
    }).then((AMap: any) => {
      if (!isMounted || !mapContainer.current) return;

      AMapRef.current = AMap;

      const mapInstance = new AMap.Map(mapContainer.current, {
        center: initialCenter,
        zoom: initialZoom,
        viewMode: "3D",
        pitch: 0,
        pitchEnable: true,
        mapStyle: "amap://styles/normal",
        features: ["bg", "road", "building", "point"],
      });

      // 添加控件
      mapInstance.addControl(new AMap.Scale());
      mapInstance.addControl(new AMap.ToolBar({
        position: {
          top: "110px",
          right: "40px",
        },
      }));

      // 点击地图空白区域
      mapInstance.on("click", (e: any) => {
        if (onMapClickRef.current) {
          onMapClickRef.current(e.lnglat.getLng(), e.lnglat.getLat());
        }
      });

      geolocationRef.current = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        convert: true,
        showButton: false,
      });

      map.current = mapInstance;
    }).catch((e: Error) => {
      console.error("高德地图加载失败:", e);
    });

    return () => {
      isMounted = false;
      userLocationMarkerRef.current?.setMap(null);
      userLocationMarkerRef.current = null;
      geolocationRef.current = null;
      routePolylinesRef.current.forEach((p) => p.setMap(null));
      routeMarkersRef.current.forEach((m) => m.setMap(null));
      draftPolylineRef.current?.setMap(null);
      draftMarkersRef.current.forEach((m) => m.setMap(null));
      map.current?.destroy();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 创建/更新 info card marker
  const createOrUpdateInfoCard = useCallback(
    (markerData: MapMarker, AMap: any, shouldOpen: boolean) => {
      if (!map.current) return;

      const existing = cardMarkersRef.current.get(markerData.id);

      if (!shouldOpen) {
        // 关闭：移除 marker
        if (existing) {
          existing.setMap(null);
          cardMarkersRef.current.delete(markerData.id);
        }
        openCardsRef.current.delete(markerData.id);
        return;
      }

      // 已打开且已存在，跳过
      if (existing) return;

      // 创建 info card marker（用 AMap.Marker 的自定义内容模拟 infoWindow）
      const cardEl = document.createElement("div");
      cardEl.className = "pinus-info-card";

      const cardColor = markerData.color || "#3b82f6";
      const photos = markerData.photos || [];
      const photoCount = Math.min(photos.length, 3);

      // 根据图片数量选择布局 class
      const photoLayoutClass = photoCount === 1
        ? "info-card-photos--single"
        : photoCount === 2
        ? "info-card-photos--double"
        : photoCount >= 3
        ? "info-card-photos--triple"
        : "";

      cardEl.innerHTML = `
        <div class="info-card-inner" style="border: 2px solid ${cardColor}; border-radius: 12px;">
          <button class="info-card-close" data-id="${markerData.id}" title="关闭">×</button>
          <h3 class="info-card-title">${escapeHtml(markerData.title)}</h3>
          ${markerData.userName ? `<p class="info-card-user">${escapeHtml(markerData.userName)}${markerData.companions && markerData.companions.length > 0 ? ` 和 ${markerData.companions.map(n => escapeHtml(n)).join("、")} 一起` : ""}</p>` : ""}
          ${markerData.content ? `<p class="info-card-content">${escapeHtml(markerData.content)}</p>` : ""}
          ${photoCount > 0
            ? `<div class="info-card-photos ${photoLayoutClass}">
                ${photos.slice(0, 3).map((url: string) =>
                  `<div class="info-card-photo-wrap"><img src="${escapeHtml(url)}" class="info-card-photo" alt="" onload="this.__onPhotoLoad?.()" /></div>`
                ).join("")}
              </div>`
            : ""}
        </div>
        <div class="info-card-arrow" style="border-top-color: ${cardColor};"></div>
      `;

      // 绑定关闭按钮事件
      const closeBtn = cardEl.querySelector(".info-card-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          createOrUpdateInfoCard(markerData, AMap, false);
        });
      }

      const innerEl = cardEl.querySelector(".info-card-inner") as HTMLElement | null;

      // 点击卡片内容区域触发详情弹窗（关闭按钮已 stopPropagation，不会触发）
      cardEl.addEventListener("click", () => {
        if (onCardClickRef.current) {
          onCardClickRef.current(markerData);
        }
      });

      // 图片加载后根据长宽比自适应
      const photoWraps = cardEl.querySelectorAll(".info-card-photo-wrap");
      let hasPortrait = false;
      photoWraps.forEach((wrap) => {
        const img = wrap.querySelector("img");
        if (img) {
          img.onload = () => {
            const ratio = img.naturalWidth / img.naturalHeight;
            // 横向图片（>1.2）→ landscape，竖向图片（<0.8）→ portrait，正方形 → square
            if (ratio > 1.2) {
              img.classList.add("info-card-photo--landscape");
              wrap.classList.add("photo-wrap--landscape");
            } else if (ratio < 0.8) {
              img.classList.add("info-card-photo--portrait");
              wrap.classList.add("photo-wrap--portrait");
              hasPortrait = true;
              // 竖向图片时卡片收窄，减少左右留白
              if (innerEl && !innerEl.classList.contains("info-card-inner--expanded")) {
                innerEl.classList.add("info-card-inner--narrow");
              }
            } else {
              img.classList.add("info-card-photo--square");
              wrap.classList.add("photo-wrap--square");
            }
          };
        }
      });

      const cardMarker = new AMap.Marker({
        position: new AMap.LngLat(markerData.longitude, markerData.latitude),
        content: cardEl,
        anchor: "bottom-center",
        offset: new AMap.Pixel(0, -44),
        zIndex: 200,
      });

      cardMarker.setMap(map.current);
      cardMarkersRef.current.set(markerData.id, cardMarker);
      openCardsRef.current.add(markerData.id);
    },
    []
  );

  // 更新标记点
  const updateMarkers = useCallback(() => {
    if (!map.current || !AMapRef.current) return;
    const AMap = AMapRef.current;

    // 清除旧 pin 标记
    pinMarkersRef.current.forEach((m: AMapMarkerInstance) => m.setMap(null));
    pinMarkersRef.current = [];

    // 清除旧的 info card markers（会在下面重新创建应打开的）
    cardMarkersRef.current.forEach((m) => m.setMap(null));
    cardMarkersRef.current.clear();
    openCardsRef.current.clear();

    // 添加新标记
    markers.forEach((markerData) => {
      // 1. Pin 标记
      const pinColor = markerData.color || "#3b82f6";
      const pinContent = document.createElement("div");
      pinContent.className = "pinus-marker";
      pinContent.innerHTML = `
        <div class="marker-pin" style="background: ${pinColor}; box-shadow: 0 2px 8px ${pinColor}88;">
          <span class="marker-emoji">📍</span>
        </div>
      `;

      const pinMarker = new AMap.Marker({
        position: new AMap.LngLat(markerData.longitude, markerData.latitude),
        content: pinContent,
        anchor: "bottom-center",
        offset: new AMap.Pixel(0, 0),
        zIndex: 100,
      });

      // 点击 pin 切换 info card
      pinMarker.on("click", () => {
        const isOpen = openCardsRef.current.has(markerData.id);
        createOrUpdateInfoCard(markerData, AMap, !isOpen);
        if (onMarkerClickRef.current) onMarkerClickRef.current(markerData);
      });

      pinMarker.setMap(map.current);
      pinMarkersRef.current.push(pinMarker);

      // 2. Info card 标记（默认打开）
      createOrUpdateInfoCard(markerData, AMap, true);
    });

    // 只在 marker IDs 真正变化或首次加载时才 setFitView
    const currentIds = markers.map((m) => m.id).sort().join(",");
    if (markers.length > 0 && (isFirstFitRef.current || currentIds !== prevMarkerIdsRef.current)) {
      const allMarkers = [
        ...pinMarkersRef.current,
        ...Array.from(cardMarkersRef.current.values()),
      ];
      map.current.setFitView(allMarkers, false, [80, 80, 80, 80]);
      if (viewModeRef.current === "3D") {
        setTimeout(() => applyViewMode("3D"), 100);
      }
      isFirstFitRef.current = false;
      prevMarkerIdsRef.current = currentIds;
    }
  }, [markers, createOrUpdateInfoCard, applyViewMode]);

  useEffect(() => {
    if (map.current) {
      updateMarkers();
    }
  }, [updateMarkers]);

  const updateRoutes = useCallback(() => {
    if (!map.current || !AMapRef.current) return;
    const AMap = AMapRef.current;

    routePolylinesRef.current.forEach((p) => p.setMap(null));
    routePolylinesRef.current = [];
    routeMarkersRef.current.forEach((m) => m.setMap(null));
    routeMarkersRef.current = [];
    if (draftPolylineRef.current) {
      draftPolylineRef.current.setMap(null);
      draftPolylineRef.current = null;
    }
    draftMarkersRef.current.forEach((m) => m.setMap(null));
    draftMarkersRef.current = [];

    const renderRoute = (route: MapRoute, dimmed: boolean) => {
      if (route.points.length < 2) return;
      const path = route.points.map(
        (p) => new AMap.LngLat(p.longitude, p.latitude)
      );
      const polyline = new AMap.Polyline({
        path,
        strokeColor: route.color,
        strokeWeight: dimmed ? 4 : 6,
        strokeOpacity: dimmed ? 0.35 : 0.9,
        lineJoin: "round",
        zIndex: dimmed ? 40 : 80,
      });
      polyline.setMap(map.current);
      routePolylinesRef.current.push(polyline);

      route.points.forEach((p, i) => {
        const role = getRoutePointRole(i, route.points.length);
        const marker = createRoutePointMarker(
          AMap,
          p.longitude,
          p.latitude,
          getRoutePointText(i, route.points.length),
          getRoutePointColor(role),
          dimmed ? 90 : 120
        );
        marker.setMap(map.current);
        routeMarkersRef.current.push(marker);
      });
    };

    const hasHighlight = !!highlightedRouteId;
    routes.forEach((route) => {
      const isHighlighted = route.id === highlightedRouteId;
      renderRoute(route, hasHighlight && !isHighlighted);
    });

    if (draftRoutePoints.length > 0) {
      draftRoutePoints.forEach((p, i) => {
        const role = getRoutePointRole(i, draftRoutePoints.length);
        const marker = createRoutePointMarker(
          AMap,
          p.longitude,
          p.latitude,
          getRoutePointText(i, draftRoutePoints.length),
          getRoutePointColor(role),
          150
        );
        marker.setMap(map.current);
        draftMarkersRef.current.push(marker);
      });

      if (draftRoutePoints.length >= 2) {
        const path = draftRoutePoints.map(
          (p) => new AMap.LngLat(p.longitude, p.latitude)
        );
        draftPolylineRef.current = new AMap.Polyline({
          path,
          strokeColor: "#8b5cf6",
          strokeWeight: 5,
          strokeOpacity: 0.85,
          strokeStyle: "dashed",
          lineJoin: "round",
          zIndex: 100,
        });
        draftPolylineRef.current.setMap(map.current);
      }
    }
  }, [routes, highlightedRouteId, draftRoutePoints]);

  useEffect(() => {
    if (map.current) updateRoutes();
  }, [updateRoutes]);

  const prevHighlightedRouteRef = useRef<string | null>(null);
  useEffect(() => {
    if (!map.current || !highlightedRouteId) return;
    if (prevHighlightedRouteRef.current === highlightedRouteId) return;
    prevHighlightedRouteRef.current = highlightedRouteId;

    const route = routes.find((r) => r.id === highlightedRouteId);
    if (!route || route.points.length === 0) return;

    const overlays = [...routePolylinesRef.current, ...routeMarkersRef.current];
    if (overlays.length > 0) {
      map.current.setFitView(overlays, false, [80, 80, 80, 80]);
      if (viewModeRef.current === "3D") {
        setTimeout(() => applyViewMode("3D"), 100);
      }
    }
  }, [highlightedRouteId, routes, applyViewMode]);

  useEffect(() => {
    if (!highlightedRouteId) {
      prevHighlightedRouteRef.current = null;
    }
  }, [highlightedRouteId]);

  const createOrUpdateInfoCardRef = useRef(createOrUpdateInfoCard);
  createOrUpdateInfoCardRef.current = createOrUpdateInfoCard;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const lastFlownSeqRef = useRef<number | null>(null);

  // 切换 2D / 3D 视图
  useEffect(() => {
    applyViewMode(viewMode);
  }, [viewMode, applyViewMode]);

  // 侧边栏点击打卡时，地图飞到对应位置（仅 seq 变化时触发，避免 markers 更新后重复飞向旧目标）
  useEffect(() => {
    if (!flyToTarget || !map.current || !AMapRef.current) return;
    if (lastFlownSeqRef.current === flyToTarget.seq) return;
    lastFlownSeqRef.current = flyToTarget.seq;

    const AMap = AMapRef.current;
    const { longitude, latitude, id } = flyToTarget;
    const targetZoom = Math.max(map.current.getZoom(), 14);

    map.current.setZoomAndCenter(
      targetZoom,
      [longitude, latitude],
      false,
      500
    );

    // setZoomAndCenter 会重置俯仰角，动画结束后恢复 3D 倾斜
    setTimeout(() => applyViewMode(viewModeRef.current), 520);

    if (id) {
      const markerData = markersRef.current.find((m) => m.id === id);
      if (markerData) {
        createOrUpdateInfoCardRef.current(markerData, AMap, true);
      }
    }
  }, [flyToTarget, applyViewMode]);

  // 清除定位目标后允许下次相同 seq 重新触发（一般不会复用 seq）
  useEffect(() => {
    if (!flyToTarget) {
      lastFlownSeqRef.current = null;
    }
  }, [flyToTarget]);

  const flyToLocationRef = useRef(flyToLocation);
  flyToLocationRef.current = flyToLocation;
  const showUserLocationRef = useRef(showUserLocation);
  showUserLocationRef.current = showUserLocation;

  // 定位到当前位置
  useEffect(() => {
    if (!locateTrigger || !map.current || !AMapRef.current) return;
    if (lastLocateSeqRef.current === locateTrigger.seq) return;
    lastLocateSeqRef.current = locateTrigger.seq;

    const AMap = AMapRef.current;
    const setLocating = (v: boolean) => onLocateStatusChangeRef.current?.(v);

    const handleSuccess = (lng: number, lat: number) => {
      flyToLocationRef.current(lng, lat);
      showUserLocationRef.current(lng, lat, AMap);
      setLocating(false);
    };

    const tryBrowserGeolocation = () => {
      if (!navigator.geolocation) {
        setLocating(false);
        alert("定位失败：浏览器不支持定位功能");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { longitude, latitude } = pos.coords;
          if (AMap.convertFrom) {
            AMap.convertFrom([longitude, latitude], "gps", (status: string, result: any) => {
              if (status === "complete" && result.locations?.[0]) {
                const loc = result.locations[0];
                handleSuccess(loc.lng, loc.lat);
              } else {
                handleSuccess(longitude, latitude);
              }
            });
          } else {
            handleSuccess(longitude, latitude);
          }
        },
        () => {
          setLocating(false);
          alert("定位失败，请允许浏览器访问您的位置");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };

    setLocating(true);

    if (geolocationRef.current) {
      geolocationRef.current.getCurrentPosition((status: string, result: any) => {
        if (status === "complete" && result.position) {
          handleSuccess(result.position.lng, result.position.lat);
        } else {
          tryBrowserGeolocation();
        }
      });
    } else {
      tryBrowserGeolocation();
    }
  }, [locateTrigger]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="h-full w-full rounded-xl" />
      {/* 标记点和信息窗样式 */}
      <style jsx global>{`
        .pinus-marker {
          cursor: pointer;
        }
        .marker-pin {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          background: #3b82f6;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
          transition: all 0.2s ease;
        }
        .marker-pin:hover {
          background: #2563eb;
          transform: rotate(-45deg) scale(1.15);
        }
        .marker-emoji {
          transform: rotate(45deg);
          font-size: 16px;
        }
        .pinus-route-point {
          cursor: default;
        }
        .route-point-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 26px;
          height: 26px;
          padding: 0 6px;
          border-radius: 13px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          border: 2px solid white;
        }
        /* Info Card 样式 */
        .pinus-info-card {
          cursor: default;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
        }
        .info-card-inner {
          position: relative;
          min-width: 180px;
          max-width: 240px;
          background: white;
          border-radius: 12px;
          padding: 10px 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
          cursor: pointer;
          transition: box-shadow 0.15s ease;
        }
        .info-card-inner:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
        }
        .info-card-inner--narrow {
          max-width: 150px;
          min-width: 120px;
        }
        .info-card-arrow {
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 8px solid #3b82f6;
          margin: 0 auto;
          position: relative;
          top: -1px;
          filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06));
        }
        .info-card-close {
          position: absolute;
          top: 6px;
          right: 8px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: rgba(0, 0, 0, 0.06);
          border-radius: 50%;
          font-size: 14px;
          line-height: 1;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s ease;
          z-index: 10;
        }
        .info-card-close:hover {
          background: rgba(0, 0, 0, 0.12);
          color: #374151;
        }
        .info-card-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 20px 6px 0;
          color: #1f2937;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .info-card-user {
          font-size: 12px;
          color: #6b7280;
          margin: 0 0 6px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .info-card-content {
          font-size: 13px;
          color: #374151;
          margin: 0 0 8px 0;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .info-card-photos {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 4px;
          /* 整个照片区域最大高度限制 */
          max-height: 120px;
          overflow: hidden;
          border-radius: 8px;
        }
        /* 单张图片布局：严格控制尺寸 */
        .info-card-photos--single {
          display: block;
          max-height: 120px;
        }
        .info-card-photos--single .info-card-photo-wrap {
          display: block;
          border-radius: 8px;
          overflow: hidden;
          max-height: 120px;
        }
        .info-card-photos--single .info-card-photo {
          display: block;
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
        }
        .info-card-photos--single .info-card-photo--landscape {
          height: 100px;
        }
        .info-card-photos--single .info-card-photo--portrait {
          height: 120px;
          width: auto;
          max-width: 120px;
          margin: 0 auto;
        }
        .info-card-photos--single .info-card-photo--square {
          height: 110px;
        }
        /* 两张图片布局：并排等高，紧凑 */
        .info-card-photos--double {
          display: flex;
          gap: 4px;
          max-height: 90px;
        }
        .info-card-photos--double .info-card-photo-wrap {
          flex: 1;
          min-width: 0;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          height: 90px;
        }
        .info-card-photos--double .info-card-photo {
          width: 100%;
          height: 90px;
          object-fit: cover;
          border-radius: 6px;
        }
        /* 三张图片布局：第一张大图 + 两张小图，紧凑 */
        .info-card-photos--triple {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 3px;
          max-height: 120px;
          height: 120px;
        }
        .info-card-photos--triple .info-card-photo-wrap:first-child {
          grid-row: 1 / 3;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
        }
        .info-card-photos--triple .info-card-photo-wrap:first-child .info-card-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }
        .info-card-photos--triple .info-card-photo-wrap:nth-child(2),
        .info-card-photos--triple .info-card-photo-wrap:nth-child(3) {
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
        }
        .info-card-photos--triple .info-card-photo-wrap:nth-child(2) .info-card-photo,
        .info-card-photos--triple .info-card-photo-wrap:nth-child(3) .info-card-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }
        /* 兜底 */
        .info-card-photo-wrap {
          border-radius: 6px;
          overflow: hidden;
        }
        .info-card-photo {
          display: block;
          object-fit: cover;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
