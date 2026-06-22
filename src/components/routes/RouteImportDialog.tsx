"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, MapPin, Loader2 } from "lucide-react";
import type { TravelRouteItem } from "./RoutePanel";

interface RouteImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (shareCode: string) => Promise<void>;
}

export default function RouteImportDialog({
  open,
  onClose,
  onImport,
}: RouteImportDialogProps) {
  const [shareCode, setShareCode] = useState("");
  const [preview, setPreview] = useState<TravelRouteItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const handlePreview = async () => {
    if (!shareCode.trim()) return;
    setPreviewLoading(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch(
        `/api/routes/import?shareCode=${encodeURIComponent(shareCode.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "分享码无效");
        return;
      }
      setPreview(data);
    } catch {
      setError("网络错误");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!shareCode.trim()) return;
    setImporting(true);
    setError("");
    try {
      await onImport(shareCode.trim());
      setShareCode("");
      setPreview(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setShareCode("");
    setPreview(null);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-violet-500" />
            导入路线
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            输入好友分享的路线分享码，即可导入到当前地图空间
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="粘贴分享码..."
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePreview()}
            />
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewLoading || !shareCode.trim()}
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "预览"
              )}
            </Button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {preview && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="font-medium text-sm">{preview.name}</p>
              <p className="text-xs text-muted-foreground">
                {preview.points.length} 个点 · 来自 {preview.user.name}
              </p>
              <div className="flex flex-wrap gap-1">
                {preview.points.map((p, i) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-0.5 rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    <MapPin className="h-3 w-3" />
                    {i === 0
                      ? "起"
                      : i === preview.points.length - 1
                      ? "终"
                      : i}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              取消
            </Button>
            <Button
              className="flex-1"
              disabled={!preview || importing}
              onClick={handleImport}
            >
              {importing ? "导入中..." : "确认导入"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
