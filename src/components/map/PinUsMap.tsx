"use client";

import { useEffect, useRef, useCallback } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";

// ============================================
// PinUs 地图组件
// 使用高德地图 JS API 2.0 + 中文标注
// 支持多 info card 同时显示
// ============================================

interface MapMarker {
  id: string;
  longitude: number;
  latitude: number;
  title: string;
  content?: string;
  userName?: string;
  photos?: string[];
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
  className = "",
}: PinUsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<AMapInstance | null>(null);
  const pinMarkersRef = useRef<AMapMarkerInstance[]>([]);
  const cardMarkersRef = useRef<Map<string, AMapMarkerInstance>>(new Map());
  const openCardsRef = useRef<Set<string>>(new Set());
  const AMapRef = useRef<any>(null);

  // 用 ref 保存最新的回调，避免闭包过期问题
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

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
        viewMode: "2D",        // 2D 视图（国内最流畅）
        mapStyle: "amap://styles/normal",  // 标准样式
        features: ["bg", "road", "building", "point"], // 显示要素
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

      map.current = mapInstance;
    }).catch((e: Error) => {
      console.error("高德地图加载失败:", e);
    });

    return () => {
      isMounted = false;
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
        <div class="info-card-inner">
          <button class="info-card-close" data-id="${markerData.id}" title="关闭">×</button>
          <h3 class="info-card-title">${escapeHtml(markerData.title)}</h3>
          ${markerData.userName ? `<p class="info-card-user">${escapeHtml(markerData.userName)}</p>` : ""}
          ${markerData.content ? `<p class="info-card-content">${escapeHtml(markerData.content)}</p>` : ""}
          ${photoCount > 0
            ? `<div class="info-card-photos ${photoLayoutClass}">
                ${photos.slice(0, 3).map((url: string) =>
                  `<div class="info-card-photo-wrap"><img src="${escapeHtml(url)}" class="info-card-photo" alt="" onload="this.__onPhotoLoad?.()" /></div>`
                ).join("")}
              </div>`
            : ""}
        </div>
      `;

      // 绑定关闭按钮事件
      const closeBtn = cardEl.querySelector(".info-card-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          createOrUpdateInfoCard(markerData, AMap, false);
        });
      }

      // 图片加载后根据长宽比自适应
      const photoWraps = cardEl.querySelectorAll(".info-card-photo-wrap");
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
      const pinContent = document.createElement("div");
      pinContent.className = "pinus-marker";
      pinContent.innerHTML = `
        <div class="marker-pin">
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

    // 自适应所有标记点（包括 info cards）
    if (markers.length > 0) {
      const allMarkers = [
        ...pinMarkersRef.current,
        ...Array.from(cardMarkersRef.current.values()),
      ];
      map.current.setFitView(allMarkers, false, [80, 80, 80, 80]);
    }
  }, [markers, createOrUpdateInfoCard]);

  useEffect(() => {
    if (map.current) {
      updateMarkers();
    }
  }, [updateMarkers]);

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
        /* Info Card 样式 */
        .pinus-info-card {
          cursor: default;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
        }
        .info-card-inner {
          position: relative;
          min-width: 200px;
          max-width: 280px;
          background: white;
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
        }
        .info-card-inner::after {
          content: "";
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 12px;
          height: 12px;
          background: white;
          box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.06);
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
        }
        .info-card-user {
          font-size: 12px;
          color: #6b7280;
          margin: 0 0 6px 0;
        }
        .info-card-content {
          font-size: 13px;
          color: #374151;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }
        .info-card-photos {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        /* 单张图片布局：自适应长宽比，宽度撑满 */
        .info-card-photos--single {
          display: block;
        }
        .info-card-photos--single .info-card-photo-wrap {
          display: block;
          border-radius: 8px;
          overflow: hidden;
        }
        .info-card-photos--single .info-card-photo {
          display: block;
          width: 100%;
          height: auto;
          max-height: 180px;
          object-fit: cover;
          border-radius: 8px;
        }
        .info-card-photos--single .info-card-photo--landscape {
          max-height: 140px;
        }
        .info-card-photos--single .info-card-photo--portrait {
          max-height: 180px;
          max-width: 140px;
        }
        .info-card-photos--single .info-card-photo--square {
          max-height: 160px;
        }
        /* 两张图片布局：并排等高 */
        .info-card-photos--double {
          display: flex;
          gap: 4px;
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
          min-height: 80px;
          max-height: 120px;
        }
        .info-card-photos--double .info-card-photo {
          width: 100%;
          height: 100%;
          min-height: 80px;
          max-height: 120px;
          object-fit: cover;
          border-radius: 6px;
        }
        /* 三张图片布局：第一张大图 + 两张小图 */
        .info-card-photos--triple {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 4px;
        }
        .info-card-photos--triple .info-card-photo-wrap:first-child {
          grid-row: 1 / 3;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          min-height: 120px;
          max-height: 180px;
        }
        .info-card-photos--triple .info-card-photo-wrap:first-child .info-card-photo {
          width: 100%;
          height: 100%;
          min-height: 120px;
          max-height: 180px;
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
          min-height: 58px;
          max-height: 88px;
        }
        .info-card-photos--triple .info-card-photo-wrap:nth-child(2) .info-card-photo,
        .info-card-photos--triple .info-card-photo-wrap:nth-child(3) .info-card-photo {
          width: 100%;
          height: 100%;
          min-height: 58px;
          max-height: 88px;
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
