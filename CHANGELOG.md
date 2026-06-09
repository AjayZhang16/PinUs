# PinUs 更新日志

---

## v0.2.0 — 2026-06-09

### 🚀 上线了！

PinUs 正式部署上线，可通过链接访问。

### ✨ 新功能

- **用户认证**：注册 / 登录（JWT Token），支持用户名 + 邮箱 + 密码
- **地图打卡**：点击高德地图任意位置，填写标题/内容/上传照片，创建打卡记录
- **照片上传**：照片存储到 Supabase Storage 云端，按用户 ID 分目录管理
- **打卡列表**：查看当前地图空间的所有打卡记录

### 🏗️ 基础设施

- **数据库迁移**：从本地 Docker PostgreSQL 迁移到 Supabase 托管 PostgreSQL
  - 使用 Transaction Pooler（端口 6543）确保国内可访问
  - 连接串加 `?pgbouncer=true` 兼容 PgBouncer
- **文件存储**：从本地 `public/uploads/` 迁移到 Supabase Storage
  - `photos` 桶，公开读取 + 公开上传 RLS 策略
- **Vercel 部署**：推代码到 GitHub 自动部署
  - 线上地址：https://pin-us-p2gp.vercel.app
  - 环境变量在 Vercel Dashboard 手动配置

### 🐛 修复

- 修复数据库密码含 `@` 导致 URL 解析错误（需编码为 `%40`）
- 修复 `prisma generate` 未在构建前执行导致部署失败
- 修复 Supabase 客户端构建时报 `supabaseUrl is required`（改为懒加载）
- 修复 Vercel 缺少 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 环境变量

---

## v0.1.0 — 2026-06-05

### 🎉 项目启动

- Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui 项目搭建
- 高德地图 JS API v2.0 集成（国内流畅访问）
- 打卡对话框 UI（点击地图弹出）
- Prisma v5 数据模型定义（User / MapSpace / MapMember / CheckIn）
- 本地开发环境跑通

---

## 📋 后续计划

### v0.3.0 — 好用（M3）

- [ ] 邀请码加入地图空间（已有字段，补全流程）
- [ ] 多地图空间切换
- [ ] 打卡照片压缩（上传前压缩到 500KB，节省 Supabase 1GB 存储额度）
- [ ] 移动端适配优化（手机端打卡体验）
- [ ] PWA 支持（添加到手机桌面）

### v0.4.0 — 好看（M3 续）

- [ ] UI 全面打磨（卡片样式、动画、暗色模式）
- [ ] 用户头像上传
- [ ] 打卡足迹时间线视图
- [ ] 地图标记聚合（打卡多了不卡）

### v0.5.0 — 能分享（M4）

- [ ] 自定义域名绑定（解决 `.vercel.app` 国内访问慢的问题）
- [ ] Docker Compose 部署方案（自部署选项）
- [ ] 部署文档（让别人也能部署自己的 PinUs）
- [ ] Supabase 防暂停（keep-alive 定时 ping）

### 未来

- [ ] 地球视图（CesiumJS / Mapbox Globe）
- [ ] 活动组织功能
- [ ] 互动功能（点赞、评论）
- [ ] 多租户 SaaS 演进
