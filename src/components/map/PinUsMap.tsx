"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ============================================
// PinUs 地图组件
// 支持 Globe（地球）视图 + 中文标注
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
  /** Mapbox Access Token */
  mapboxToken: string;
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

export default function PinUsMap({
  mapboxToken,
  markers = [],
  initialCenter = [104.1954, 35.8617], // 中国中心
  initialZoom = 3.5,
  onMapClick,
  onMarkerClick,
  className = "",
}: PinUsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // 如果没有 token，显示提示界面
  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 rounded-xl ${className}`}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">需要配置 Mapbox Token</h3>
          <p className="text-sm text-slate-500 mb-4">
            请在 <code className="bg-slate-200 px-1 py-0.5 rounded">.env</code> 文件中配置{' '}
            <code className="bg-slate-200 px-1 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code>
          </p>
          <a
            href="https://account.mapbox.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            获取 Mapbox Token →
          </a>
        </div>
      </div>
    );
  }

  // 初始化地图
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: initialZoom,
      projection: "globe", // 地球投影
      language: "zh-Hans",  // 中文标注
    });

    // 添加导航控件
    mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapInstance.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), "top-right");

    // 大气效果（地球视角下更美观）
    mapInstance.on("style.load", () => {
      mapInstance.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.6,
      });
    });

    // 点击地图空白区域
    mapInstance.on("click", (e) => {
      // 如果点击的不是标记点，则触发 onMapClick
      const features = mapInstance.queryRenderedFeatures(e.point);
      const isMarker = features.some(
        (f) => f.layer?.id === "markers-layer" || f.source === "markers-source"
      );
      if (!isMarker && onMapClick) {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      }
    });

    map.current = mapInstance;

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 更新标记点
  const updateMarkers = useCallback(() => {
    if (!map.current) return;

    // 清除旧标记
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 添加新标记
    markers.forEach((markerData) => {
      // 创建自定义标记元素
      const el = document.createElement("div");
      el.className = "pinus-marker";
      el.innerHTML = `
        <div class="marker-pin">
          <span class="marker-emoji">📍</span>
        </div>
      `;

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([markerData.longitude, markerData.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, maxWidth: "280px" }).setHTML(`
            <div class="marker-popup">
              <h3 class="marker-popup-title">${markerData.title}</h3>
              ${markerData.userName ? `<p class="marker-popup-user">👤 ${markerData.userName}</p>` : ""}
              ${markerData.content ? `<p class="marker-popup-content">${markerData.content}</p>` : ""}
              ${markerData.photos && markerData.photos.length > 0 ? 
                `<div class="marker-popup-photos">
                  ${markerData.photos.slice(0, 3).map((url) => 
                    `<img src="${url}" class="marker-popup-photo" alt="打卡照片" />`
                  ).join("")}
                </div>` : ""}
            </div>
          `)
        )
        .addTo(map.current!);

      // 点击标记点
      el.addEventListener("click", () => {
        if (onMarkerClick) onMarkerClick(markerData);
      });

      markersRef.current.push(marker);
    });
  }, [markers, onMarkerClick]);

  useEffect(() => {
    if (map.current?.loaded()) {
      updateMarkers();
    } else {
      map.current?.on("load", updateMarkers);
    }
  }, [updateMarkers]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="h-full w-full rounded-xl" />
      {/* 标记点样式 */}
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
        .mapboxgl-popup-content {
          border-radius: 12px !important;
          padding: 12px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
        }
      `}</style>
    </div>
  );
}
