"use client";

import dynamic from "next/dynamic";

// Mapbox 需要浏览器环境，使用 dynamic import 避免 SSR 问题
const PinUsMap = dynamic(() => import("./PinUsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-muted">
      <div className="text-center">
        <div className="mb-2 text-4xl">🗺️</div>
        <p className="text-sm text-muted-foreground">地图加载中...</p>
      </div>
    </div>
  ),
});

export default PinUsMap;
