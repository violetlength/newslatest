# 生产环境URL动态转换指南

## 功能说明

在生产环境中，当用户点击数据源时，系统会自动将Vercel域名的API请求转换为实际的API域名请求。

## 转换规则

### 转换前
```
https://newslatest-ten.vercel.app/api/juejin/content_api/v1/content/article_rank?category_id=1&type=hot
```

### 转换后
```
https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot
```

## 工作原理

### 1. 环境检测
- **开发环境**: 使用Vite代理，URL不变
- **生产环境**: 启用URL转换功能

### 2. URL转换逻辑
```typescript
// 检查URL路径是否以 /api/ 开头
if (pathname.startsWith('/api/')) {
  // 提取API名称: /api/juejin/... -> 'juejin'
  const apiName = pathParts[2];
  
  // 查找对应的实际域名
  const domain = API_DOMAINS[apiName];
  
  // 构建新的URL
  return `${domain}${apiPath}${search}`;
}
```

### 3. 支持的API转换

| API名称 | 转换前 | 转换后 |
|---------|--------|--------|
| 掘金 | `/api/juejin/*` | `https://api.juejin.cn/*` |
| 哔哩哔哩 | `/api/bilibili/*` | `https://api.bilibili.com/*` |
| 微博 | `/api/weibo/*` | `https://weibo.com/*` |
| 知乎 | `/api/zhihu/*` | `https://api.zhihu.com/*` |
| GitHub | `/api/github/*` | `https://api.github.com/*` |
| 36氪 | `/api/36kr/*` | `https://gateway.36kr.com/*` |
| IT之家 | `/api/ithome/*` | `https://m.ithome.com/*` |
| 思否 | `/api/segmentfault/*` | `https://segmentfault.com/*` |
| 开源中国 | `/api/oschina/*` | `https://www.oschina.net/*` |
| InfoQ | `/api/infoq/*` | `https://www.infoq.cn/*` |
| 阮一峰博客 | `/api/ruanyifeng/*` | `https://www.ruanyifeng.com/*` |
| CSDN | `/api/csdn/*` | `https://blog.csdn.net/*` |
| 证券时报 | `/api/stcn/*` | `https://www.stcn.com/*` |
| 财新网 | `/api/caixin/*` | `https://finance.caixin.com/*` |

## 实现细节

### 1. Axios请求拦截器
```typescript
api.interceptors.request.use((config) => {
  if (config.url && shouldUseDirectApi()) {
    const transformedUrl = transformApiUrl(originalUrl);
    if (transformedUrl !== originalUrl) {
      config.url = transformedUrl;
      // 记录转换日志
      ApiLogger.info('URL转换', `转换API URL: ${originalUrl} -> ${transformedUrl}`);
    }
  }
  return config;
});
```

### 2. 环境变量控制
```env
# .env.production
VITE_API_BASE_URL=  # 空值表示启用URL转换
# VITE_API_BASE_URL=https://your-domain.com/api  # 设置值则使用代理
```

### 3. 自动检测条件
```typescript
export function shouldUseDirectApi(): boolean {
  return isProduction && !import.meta.env.VITE_API_BASE_URL;
}
```

## 使用场景

### 场景1: Vercel部署（推荐）
- 自动URL转换
- 直接请求实际API
- 减少中间层延迟

### 场景2: 自建代理服务器
- 设置 `VITE_API_BASE_URL`
- 使用统一的代理服务器
- 便于监控和缓存

### 场景3: 开发环境
- 使用Vite代理
- 解决跨域问题
- 便于调试

## 测试验证

### 开发环境测试
```bash
npm run dev
# 查看控制台输出的URL转换测试结果
```

### 生产环境验证
1. 部署到Vercel
2. 打开浏览器开发者工具
3. 点击数据源
4. 查看Network面板中的请求URL

## 注意事项

### 1. CORS问题
直接请求第三方API可能遇到CORS限制，解决方案：
- 使用支持CORS的API
- 配置服务器端代理
- 使用JSONP（如适用）

### 2. API频率限制
直接请求可能触发API频率限制，建议：
- 实现客户端缓存
- 添加请求节流
- 监控API使用量

### 3. 错误处理
转换失败时会回退到原始URL：
```typescript
try {
  const transformedUrl = transformApiUrl(originalUrl);
  return transformedUrl;
} catch (error) {
  console.warn('URL转换失败:', error);
  return originalUrl;
}
```

## 配置选项

### 禁用URL转换
```env
# .env.production
VITE_API_BASE_URL=https://your-domain.com/api
```

### 添加新的API转换
1. 在 `API_DOMAINS` 中添加映射
2. 确保API支持CORS或配置代理
3. 测试转换功能

现在你的应用可以在生产环境中智能地处理API请求URL了！
