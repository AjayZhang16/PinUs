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
import { LogIn, UserPlus } from "lucide-react";

// ============================================
// 登录/注册对话框
// ============================================

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; name: string; email: string; avatarUrl?: string | null }, mapSpaceId: string) => void;
}

export default function AuthDialog({ open, onClose, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setError("");
    setIsLoading(false);
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const body =
        mode === "register"
          ? { action: "register", name, email, password }
          : { action: "login", email, password };

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }

      onSuccess(data.user, data.mapSpaceId);
      resetForm();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "login" ? (
              <LogIn className="h-5 w-5 text-blue-500" />
            ) : (
              <UserPlus className="h-5 w-5 text-blue-500" />
            )}
            {mode === "login" ? "登录" : "注册"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">昵称</label>
              <Input
                placeholder="你的名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">邮箱</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">密码</label>
            <Input
              type="password"
              placeholder={mode === "register" ? "至少 6 位" : "输入密码"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isLoading}
          >
            {isLoading
              ? "处理中..."
              : mode === "login"
              ? "登录"
              : "注册"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                还没有账号？{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-blue-500 hover:underline"
                >
                  注册
                </button>
              </>
            ) : (
              <>
                已有账号？{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-blue-500 hover:underline"
                >
                  登录
                </button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
