# 📍 PinUs

> 把我们钉在地图上 —�?和朋友一起在地图上记录足迹、分享日�?
## �?功能特�?
- 🗺�?**地图打卡** �?在地图上标记你的足迹，支持地�?平面视图切换
- 🇨🇳 **中文地图** �?中文地名标注，本地化体验
- 📸 **照片记录** �?为每次打卡上传照片，留下美好回忆
- 👥 **团队协作** �?创建地图空间，邀请朋友一起打�?- 🔗 **邀请码加入** �?分享邀请码，朋友一键加�?- 📱 **响应式设�?* �?支持手机、平板、电脑访�?- 🐳 **自部�?* �?Docker 一键部署，数据完全自主

## 🛠�?技术栈

| 层级 | 技�?| 说明 |
|-----|------|------|
| 框架 | Next.js 16 (App Router) | 全栈 React 框架 |
| UI | Tailwind CSS + shadcn/ui | 美观的组件系�?|
| 地图 | Mapbox GL JS | Globe 视图 + 中文标注 |
| 数据�?| PostgreSQL | 关系型数据库 |
| ORM | Prisma | 类型安全的数据库操作 |
| 部署 | Vercel / Docker | 灵活的部署方�?|

## 🚀 快速开�?
### 前置条件

- Node.js 20+
- PostgreSQL 数据�?- Mapbox Access Token（[免费获取](https://account.mapbox.com/)�?
### 1. 克隆项目

```bash
git clone https://github.com/AjayZhang16/PinUs.git
cd pinus
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下信息：

```env
# 数据库连�?DATABASE_URL="postgresql://postgres:password@localhost:5432/pinus"

# Mapbox Token（从 https://account.mapbox.com/ 获取�?NEXT_PUBLIC_MAPBOX_TOKEN="your_mapbox_token"
```

### 4. 初始化数据库

```bash
npx prisma migrate dev --name init
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看效果 🎉

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
# 一键启�?PostgreSQL + PinUs
docker compose up -d
```

### 手动 Docker 构建

```bash
# 构建镜像
docker build -t pinus .

# 运行容器
docker run -d \
  --name pinus \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:password@db:5432/pinus" \
  -e NEXT_PUBLIC_MAPBOX_TOKEN="your_token" \
  pinus
```

## 📁 项目结构

```
pinus/
├── prisma/
�?  └── schema.prisma          # 数据库模型定�?├── src/
�?  ├── app/
�?  �?  ├── api/               # API 路由
�?  �?  �?  ├── checkins/      # 打卡记录 API
�?  �?  �?  └── mapspaces/     # 地图空间 API
�?  �?  ├── layout.tsx         # 根布局
�?  �?  └── page.tsx           # 主页�?�?  ├── components/
�?  �?  ├── map/               # 地图组件
�?  �?  �?  ├── PinUsMap.tsx   # Mapbox 地图核心
�?  �?  �?  └── index.tsx      # 动态加载包�?�?  �?  ├── checkin/           # 打卡组件
�?  �?  �?  └── CheckInForm.tsx
�?  �?  └── ui/                # shadcn/ui 组件
�?  ├── lib/
�?  �?  ├── prisma.ts          # Prisma 客户�?�?  �?  └── utils.ts           # 工具函数
�?  └── generated/             # Prisma 自动生成
├── .env.example               # 环境变量示例
├── docker-compose.yml         # Docker 编排
├── Dockerfile                 # Docker 构建
└── README.md                  # 项目文档
```

## 🗺�?开发路线图

### M1：能�?�?(当前)
- [x] 项目搭建
- [x] Mapbox Globe 地图展示
- [x] 打卡标记点展�?- [x] 打卡发布对话�?- [x] 侧边栏时间线

### M2：能�?- [ ] 用户认证（NextAuth.js�?- [ ] 邀请码加入地图
- [ ] 照片上传（S3 存储�?- [ ] 地图空间 CRUD

### M3：好�?- [ ] UI 打磨 + 动画
- [ ] 移动端适配
- [ ] PWA 离线支持
- [ ] 暗色模式

### M4：能分享
- [ ] Docker 化部�?- [ ] 部署文档
- [ ] 一键部署脚�?
## 📄 许可�?
MIT License

---

**PinUs** �?把我们钉在地图上 📍
