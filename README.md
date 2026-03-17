# AndroidList - 移动端新闻应用

基于Vue3 + Element Plus + Vite构建的移动端新闻应用，可使用HBuilderX打包成APK。

## 项目特点

- 🚀 Vue3 + TypeScript + Vite 现代化开发框架
- 📱 移动端优化，支持触摸交互
- 🎨 Element Plus UI组件库，美观易用
- 📦 Pinia状态管理
- 🌐 Axios网络请求
- 🔄 支持多个新闻源
- 💾 缓存机制
- 📱 响应式设计，适配各种移动设备

## 技术栈

- **前端框架**: Vue 3.5.13
- **UI组件库**: Element Plus 2.13.2
- **构建工具**: Vite 6.0.3
- **状态管理**: Pinia 3.0.4
- **HTTP客户端**: Axios 1.13.5
- **开发语言**: TypeScript 5.6.2

## 项目结构

```
androidList/
├── public/                 # 静态资源
├── src/
│   ├── assets/            # 资源文件
│   ├── components/        # 组件
│   │   ├── AndroidHeader.vue
│   │   ├── AndroidSidebar.vue
│   │   ├── AndroidContent.vue
│   │   └── AndroidLayout.vue
│   ├── services/          # 服务层
│   │   └── web.ts        # Web API服务
│   ├── stores/            # 状态管理
│   │   └── news.ts       # 新闻数据状态
│   ├── types/             # 类型定义
│   │   └── index.ts
│   ├── App.vue           # 根组件
│   ├── main.ts           # 入口文件
│   └── vite-env.d.ts     # Vite类型声明
├── package.json
├── vite.config.ts        # Vite配置
├── tsconfig.json         # TypeScript配置
├── tsconfig.node.json    # Node.js TypeScript配置
└── index.html            # HTML模板
```

## 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 开发模式

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
# 或
pnpm build
```

### 预览构建结果

```bash
npm run preview
# 或
yarn preview
# 或
pnpm preview
```

## HBuilderX打包APK

### 准备工作

1. 安装HBuilderX
2. 创建5+ App项目
3. 将项目文件复制到HBuilderX项目中

### 打包步骤

1. 在HBuilderX中打开项目
2. 选择"发行" -> "原生App-云打包"
3. 配置打包参数：
   - 应用名称：AndroidList
   - 应用图标：替换默认图标
   - 启动页：设置启动页图片
4. 选择打包平台（Android）
5. 点击"打包"

### 本地打包（需要Android SDK）

1. 配置Android SDK路径
2. 选择"发行" -> "原生App-本地打包"
3. 生成APK文件

## 功能特性

### 新闻源支持

- 哔哩哔哩 - 热门视频
- 微博 - 实时热点
- 知乎 - 热门问题
- GitHub - 热门项目
- 掘金 - 技术文章
- 抖音 - 热门视频
- 36氪 - 科技资讯
- IT之家 - 科技新闻
- 思否 - 技术问答
- 开源中国 - 开源资讯
- InfoQ - 技术媒体
- 阮一峰博客 - 技术周刊
- CSDN - 开发者社区
- 证券时报 - 财经新闻
- 财新网 - 金融资讯

### 移动端优化

- 响应式布局，适配各种屏幕尺寸
- 触摸友好的交互设计
- 侧边栏抽屉式导航
- 底部抽屉显示详情
- 优化的字体大小和间距
- 流畅的动画效果

### 数据管理

- Pinia状态管理
- 本地缓存机制
- 错误处理和重试
- 加载状态显示

## 开发说明

### API接口

项目使用模拟数据，实际部署时需要配置真实的API接口。在`src/services/web.ts`中修改API地址：

```typescript
const api = axios.create({
  baseURL: "https://your-api-domain.com/api", // 修改为实际API地址
  timeout: 10000,
});
```

### 样式定制

项目使用Element Plus主题，可在`src/App.vue`中修改全局样式：

```css
:root {
  --el-color-primary: #409eff; /* 主题色 */
  --el-font-size-base: 14px;   /* 基础字体大小 */
}
```

### 图标配置

在`src/components/AndroidSidebar.vue`中配置图标映射：

```typescript
const iconMap: Record<string, string> = {
  "VideoPlay": "video-play",
  // 添加更多图标映射
};
```

## 部署说明

### Web部署

构建完成后，将`dist`目录部署到Web服务器即可。

### 移动端打包

使用HBuilderX打包为原生应用：

1. 云打包：使用DCloud云服务
2. 本地打包：需要配置Android开发环境

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进项目。

## 更新日志

### v0.1.0 (2024-01-XX)

- 初始版本发布
- 支持多个新闻源
- 移动端优化
- HBuilderX打包支持
