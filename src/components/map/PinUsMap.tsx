"use client";

import { useEffect, useRef, useCallback } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";

// ============================================
// PinUs 地图组件
// 使用高德地图 JS API 2.0 + 中文标注
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
type AMapInfoWindowInstance = any;

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
  const markersRef = useRef<AMapMarkerInstance[]>([]);
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

  // 更新标记点
  const updateMarkers = useCallback(() => {
    if (!map.current || !AMapRef.current) return;
    const AMap = AMapRef.current;

    // 清除旧标记
    markersRef.current.forEach((m: AMapMarkerInstance) => m.setMap(null));
    markersRef.current = [];

    // 添加新标记
    markers.forEach((markerData) => {
      // 自定义标记内容
      const markerContent = document.createElement("div");
      markerContent.className = "pinus-marker";
      markerContent.innerHTML = `
        <div class="marker-pin">
          <span class="marker-emoji">📍</span>
        </div>
      `;

      const marker = new AMap.Marker({
        position: new AMap.LngLat(markerData.longitude, markerData.latitude),
        content: markerContent,
        anchor: "bottom-center",
        offset: new AMap.Pixel(0, 0),
      });

      // 信息窗体内容
      const infoContent = `
        <div class="marker-popup">
          <h3 class="marker-popup-title">${markerData.title}</h3>
          ${markerData.userName ? `<p class="marker-popup-user">👤 ${markerData.userName}</p>` : ""}
          ${markerData.content ? `<p class="marker-popup-content">${markerData.content}</p>` : ""}
          ${markerData.photos && markerData.photos.length > 0
            ? `<div class="marker-popup-photos">
                ${markerData.photos.slice(0, 3).map((url: string) =>
                  `<img src="${url}" class="marker-popup-photo" alt="打卡照片" />`
                ).join("")}
              </div>`
            : ""}
        </div>
      `;

      const infoWindow = new AMap.InfoWindow({
        content: infoContent,
        offset: new AMap.Pixel(0, -36),
        closeWhenClickMap: true,
      });

      marker.on("click", () => {
        infoWindow.open(map.current, marker.getPosition());
        if (onMarkerClickRef.current) onMarkerClickRef.current(markerData);
      });

      marker.setMap(map.current);
      markersRef.current.push(marker);
    });

    // 自适应所有标记点
    if (markers.length > 0) {
      map.current.setFitView(markersRef.current, false, [60, 60, 60, 60]);
    }
  }, [markers, onMarkerClick]);

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
        .marker-popup {
          padding: 4px;
          min-width: 180px;
        }
        .marker-popup-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1f2937;
        }
        .marker-popup-user {
          font-size: 12px;
          color: #6b7280;
          margin: 0 0 4px 0;
        }
        .marker-popup-content {
          font-size: 13px;
          color: #374151;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }
        .marker-popup-photos {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .marker-popup-photo {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: 6px;
        }
        .amap-info-content {
          padding: 12px !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
        }
      `}</style>
    </div>
  );
}
