"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Camera, X } from "lucide-react";

// ============================================
// 打卡发布对话框
// ============================================

interface CheckInFormProps {
  /** 预填的经纬度 */
  longitude: number;
  latitude: number;
  /** 地址文字描述 */
  address?: string;
  /** 提交回调 */
  onSubmit: (data: CheckInFormData) => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 是否正在提交 */
  isSubmitting?: boolean;
}

export interface CheckInFormData {
  title: string;
  content: string;
  longitude: number;
  latitude: number;
  address: string;
  photos: string[]; // 暂存 URL，后续对接 S3 存储
  visitedAt: string;
}

export default function CheckInForm({
  longitude,
  latitude,
  address = "",
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CheckInFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [addressText, setAddressText] = useState(address);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      longitude,
      latitude,
      address: addressText.trim(),
      photos: photoUrls,
      visitedAt: new Date().toISOString(),
    });
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            发布打卡
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 位置信息 */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </span>
            {addressText && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {addressText}
              </Badge>
            )}
          </div>

          {/* 标题 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">标题 *</label>
            <Input
              placeholder="给这次打卡起个名字..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              required
            />
          </div>

          {/* 内容 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">记录</label>
            <Textarea
              placeholder="今天在这里做了什么..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* 地址 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">地址</label>
            <Input
              placeholder="补充地点描述（如：星巴克朝阳店）"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* 照片 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">照片</label>
            <div className="flex flex-wrap gap-2">
              {photoUrls.map((url, index) => (
                <div key={index} className="group relative h-20 w-20">
                  <img
                    src={url}
                    alt={`照片 ${index + 1}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-400"
              >
                <div className="text-center">
                  <Camera className="mx-auto h-6 w-6" />
                  <span className="text-xs">上传</span>
                </div>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              照片上传功能将在对接 S3 存储后启用
            </p>
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "发布中..." : "📍 打卡！"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
