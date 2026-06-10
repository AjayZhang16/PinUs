# PinUs 更新日志

---

## v0.3.0 — 2026-06-10

### ✨ 新功能

- **移动端适配**：侧边栏改为抽屉式覆盖层，地图全屏显示，右下角浮动打卡按钮
- **照片压缩**：上传前自动压缩到 1600px / 70% 质量，每张约 200-500KB（原来 2-3MB），1GB 存储可存 2000+ 张
- **邀请码加入**：侧边栏底部"加入地图"按钮，输入邀请码即可加入别人的地图空间
- **多空间切换**：侧边栏顶部下拉选择器，在多个地图空间间切换
- **邀请码复制**：侧边栏显示当前空间的邀请码，一键复制分享给朋友
- **成员列表**：成员 Tab 完整显示所有成员（头像+名字+角色），不再只显示主人
- **删除打卡**：时间线卡片上可删除自己的打卡记录（有确认弹窗）

### 🔧 改进

- 桌面端侧边栏改为宽度动画收起（之前是直接隐藏）
- 移动端侧边栏有毛玻璃遮罩，点击外部自动关闭
- 打卡后移动端自动关闭侧边栏
- 日期显示更简洁（去掉年份）
- 使用 `h-dvh` 替代 `h-screen` 修复移动浏览器地址栏遮挡

### 🛠️ 技术变更

- 新增 `src/lib/image-compress.ts` 图片压缩工具
- `CheckInForm` 上传前先压缩再上传
- `POST /api/checkins` 新增 `DELETE` 方法（仅作者可删）
- `GET /api/mapspaces` 返回成员用户详情（名字+头像）

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

### v0.4.0 — 好看

- [ ] 暗色模式切换
- [ ] UI 全面打磨（卡片样式、动画）
- [ ] 用户头像上传
- [ ] 打卡足迹时间线视图优化
- [ ] 地图标记聚合（打卡多了不卡）

### v0.5.0 — 能分享

- [ ] 自定义域名绑定（pinus-map.xyz）
- [ ] Docker Compose 部署方案（自部署选项）
- [ ] 部署文档（让别人也能部署自己的 PinUs）
- [ ] Supabase 防暂停（keep-alive 定时 ping）

### 未来

- [ ] 地球视图（CesiumJS / Mapbox Globe）
- [ ] 活动组织功能
- [ ] 互动功能（点赞、评论）
- [ ] 多租户 SaaS 演进
