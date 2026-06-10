"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Camera, X, Loader2, Users, UserPlus } from "lucide-react";
import { compressImage } from "@/lib/image-compress";

// ============================================
// 打卡发布对话框（对接 API + 照片上传 + 同伴选择）
// ============================================

interface CompanionItem {
  userId?: string;
  name: string;
}

interface MemberOption {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

interface CheckInFormProps {
  /** 预填的经纬度 */
  longitude: number;
  latitude: number;
  /** 地址文字描述 */
  address?: string;
  /** 当前空间的成员列表（用于联想） */
  members?: MemberOption[];
  /** 当前用户ID（排除自己） */
  currentUserId?: string;
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
  photos: string[];
  companions: CompanionItem[];
  color: string;
  visitedAt: string;
}

export default function CheckInForm({
  longitude,
  latitude,
  address = "",
  members = [],
  currentUserId = "",
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CheckInFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [addressText, setAddressText] = useState(address);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 颜色选择
  const presetColors = [
    "#3b82f6", // 蓝
    "#ef4444", // 红
    "#f97316", // 橙
    "#eab308", // 黄
    "#22c55e", // 绿
    "#06b6d4", // 青
    "#8b5cf6", // 紫
    "#ec4899", // 粉
    "#6366f1", // 靛蓝
    "#78716c", // 灰棕
  ];
  const [color, setColor] = useState(presetColors[0]);

  // 同伴相关状态
  const [companions, setCompanions] = useState<CompanionItem[]>([]);
  const [companionInput, setCompanionInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const companionInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 过滤可选成员：排除自己和已选的
  const availableMembers = members.filter(
    (m) =>
      m.userId !== currentUserId &&
      !companions.some((c) => c.userId === m.userId)
  );

  // 根据输入过滤联想列表
  const filteredMembers = companionInput.trim()
    ? availableMembers.filter((m) =>
        m.name.toLowerCase().includes(companionInput.trim().toLowerCase())
      )
    : availableMembers;

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        companionInputRef.current &&
        !companionInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addCompanion = (item: CompanionItem) => {
    // 去重：已有同名或同userId的不重复添加
    if (item.userId && companions.some((c) => c.userId === item.userId)) return;
    if (!item.userId && companions.some((c) => !c.userId && c.name === item.name)) return;
    setCompanions([...companions, item]);
    setCompanionInput("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const removeCompanion = (index: number) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const handleCompanionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !companionInput && companions.length > 0) {
      // 空输入时退格删除最后一个同伴
      removeCompanion(companions.length - 1);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredMembers.length) {
        // 选择高亮的联想项
        const member = filteredMembers[highlightedIndex];
        addCompanion({ userId: member.userId, name: member.name });
      } else if (companionInput.trim()) {
        // 手动输入的名字
        addCompanion({ name: companionInput.trim() });
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredMembers.length - 1 ? prev + 1 : prev
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      return;
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

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
      companions,
      color,
      visitedAt: new Date().toISOString(),
    });
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // 照片上传处理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 最多 9 张照片
    const remaining = 9 - photoUrls.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    if (filesToUpload.length === 0) {
      alert("最多上传 9 张照片");
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // 压缩图片后再上传（节省 Supabase 1GB 存储空间）
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed, file.name.replace(/\.[^.]+$/, ".jpg"));

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "上传失败");
        }

        const data = await res.json();
        return data.url as string;
      });

      const urls = await Promise.all(uploadPromises);
      setPhotoUrls((prev) => [...prev, ...urls]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
      // 重置 file input，允许重复选同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

          {/* 钉子颜色 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">标记颜色</label>
            <div className="flex items-center gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
                  }}
                  title={c}
                />
              ))}
              {/* 自定义颜色输入 */}
              <div className="relative ml-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded-full border-0 p-0 opacity-0 absolute inset-0"
                  title="自定义颜色"
                />
                <div
                  className="h-7 w-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400"
                  style={{ backgroundColor: presetColors.includes(color) ? 'transparent' : color }}
                >
                  <span className="text-xs">+</span>
                </div>
              </div>
            </div>
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

          {/* 同伴 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              同伴
            </label>
            <div className="relative">
              <div className="flex flex-wrap gap-1.5 rounded-lg border bg-background px-2.5 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-[40px]">
                {/* 已选同伴标签 */}
                {companions.map((c, i) => (
                  <Badge
                    key={c.userId || c.name}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1 text-xs h-6"
                  >
                    {c.name}
                    <button
                      type="button"
                      onClick={() => removeCompanion(i)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
                {/* 输入框 */}
                <input
                  ref={companionInputRef}
                  value={companionInput}
                  onChange={(e) => {
                    setCompanionInput(e.target.value);
                    setShowSuggestions(true);
                    setHighlightedIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleCompanionKeyDown}
                  placeholder={companions.length === 0 ? "输入名字搜索或添加同伴..." : ""}
                  className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                />
              </div>

              {/* 联想下拉列表 */}
              {showSuggestions && (filteredMembers.length > 0 || companionInput.trim()) && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
                >
                  {/* 组内成员联想 */}
                  {filteredMembers.map((member, i) => (
                    <button
                      key={member.userId}
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                        i === highlightedIndex
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-muted"
                      }`}
                      onClick={() =>
                        addCompanion({ userId: member.userId, name: member.name })
                      }
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                        {member.name[0]}
                      </div>
                      <span className="flex-1 truncate">{member.name}</span>
                      <span className="text-xs text-muted-foreground">组内成员</span>
                    </button>
                  ))}

                  {/* 手动添加入口（输入了不在列表中的名字时） */}
                  {companionInput.trim() &&
                    !filteredMembers.some(
                      (m) =>
                        m.name.toLowerCase() ===
                        companionInput.trim().toLowerCase()
                    ) && (
                      <button
                        type="button"
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                          highlightedIndex === filteredMembers.length
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-muted"
                        }`}
                        onClick={() =>
                          addCompanion({ name: companionInput.trim() })
                        }
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs">
                          <UserPlus className="h-3 w-3 text-gray-500" />
                        </div>
                        <span>
                          添加「{companionInput.trim()}」
                        </span>
                      </button>
                    )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              输入名字可搜索组内成员，也可直接添加其他同伴
            </p>
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
              {photoUrls.length < 9 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-400 disabled:opacity-50"
                  >
                    <div className="text-center">
                      {uploading ? (
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Camera className="mx-auto h-6 w-6" />
                          <span className="text-xs">上传</span>
                        </>
                      )}
                    </div>
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              支持 JPG/PNG/GIF/WebP，单张不超过 5MB，最多 9 张
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
              disabled={!title.trim() || isSubmitting || uploading}
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
