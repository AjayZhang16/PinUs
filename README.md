<div align="center">

# 📍 PinUs

### 把我们钉在地图上

和朋友一起在地图上记录足迹、分享日记

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ 功能特性

- 🗺️ **地图打卡** — 在地图上标记你的足迹，支持高德地图中文标注
- 📝 **日记记录** — 为每次打卡添加文字和照片，留下美好回忆
- 📸 **照片上传** — 本地存储照片，随时回看
- 🔐 **用户认证** — 注册/登录，JWT 身份验证
- 👥 **地图空间** — 创建专属地图，邀请朋友一起打卡（开发中）
- 🔗 **邀请码加入** — 分享邀请码，朋友一键加入（开发中）
- 📱 **响应式设计** — 支持手机、平板、电脑访问
- 🐳 **自部署** — Docker 一键部署，数据完全自主

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|:---:|------|------|
| 框架 | Next.js 16 (App Router) | 全栈 React 框架 |
| 语言 | TypeScript | 类型安全 |
| UI | Tailwind CSS + shadcn/ui | 美观的组件系统 |
| 地图 | 高德地图 JS API 2.0 | 中文地图标注 |
| 数据库 | PostgreSQL 16 | 关系型数据库 |
| ORM | Prisma 5 | 类型安全的数据库操作 |
| 认证 | JWT | 无状态身份验证 |
| 部署 | Docker / Vercel | 灵活的部署方式 |

## 🚀 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)（用于运行 PostgreSQL）
- [高德地图 Key](https://lbs.amap.com/)（免费注册获取）

### 1. 克隆项目

```bash
git clone https://github.com/AjayZhang16/PinUs.git
cd PinUs
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的高德地图 Key：

```env
# 高德地图 Key（从 https://lbs.amap.com/ 注册获取）
NEXT_PUBLIC_AMAP_KEY="你的高德地图Key"
NEXT_PUBLIC_AMAP_SECURITY_KEY="你的安全密钥"
```

> 💡 注册高德开放平台 → 创建应用 → 添加 Key → 服务平台选 **"Web端(JS API)"**

### 4. 启动数据库

```bash
docker compose up -d db
```

### 5. 初始化数据库

```bash
npx prisma db push
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看效果 🎉

## 🐳 Docker 部署

### 一键启动（推荐）

```bash
docker compose up -d
```

### 手动构建

```bash
docker build -t pinus .
docker run -d \
  --name pinus \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@db:5432/pinus" \
  -e NEXT_PUBLIC_AMAP_KEY="your_key" \
  pinus
```

## 📁 项目结构

```
pinus/
├── prisma/
│   └── schema.prisma          # 数据库模型定义
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # 认证 API（注册/登录）
│   │   │   ├── checkins/      # 打卡记录 API
│   │   │   └── upload/        # 照片上传 API
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx           # 主页面
│   ├── components/
│   │   ├── auth/              # 登录/注册组件
│   │   ├── checkin/           # 打卡表单组件
│   │   ├── map/               # 地图组件
│   │   └── ui/                # shadcn/ui 组件
│   └── lib/
│       ├── auth.ts            # JWT 认证工具
│       ├── prisma.ts          # Prisma 客户端
│       └── utils.ts           # 工具函数
├── public/
│   └── uploads/               # 上传照片存储
├── .env.example               # 环境变量示例
├── docker-compose.yml         # Docker 编排
├── Dockerfile                 # Docker 构建
└── README.md
```

## 📊 数据模型

```
User ──< MapMember >── MapSpace
  │
  └──< CheckIn
         ├── latitude / longitude（经纬度）
         ├── title / content（标题 + 日记）
         └── photos（照片路径）
```

## 🗺️ 开发路线图

### M1：能跑 ✅
- [x] 项目搭建（Next.js + TypeScript + Tailwind）
- [x] 高德地图展示 + 中文标注
- [x] 打卡标记点显示
- [x] 打卡发布对话框
- [x] 侧边栏时间线

### M2：能用 🚧
- [x] 用户注册 / 登录（JWT）
- [x] 打卡数据写入数据库
- [x] 照片上传（本地存储）
- [ ] 邀请码加入地图空间
- [ ] 地图空间 CRUD

### M3：好看
- [ ] UI 打磨 + 动画
- [ ] 移动端适配优化
- [ ] PWA 离线支持
- [ ] 暗色模式

### M4：能分享
- [ ] Docker 化部署
- [ ] 部署文档
- [ ] 一键部署脚本

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交变更：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 许可证

[MIT License](LICENSE)

---

<div align="center">

**PinUs** 📍 — 把我们钉在地图上

</div>
