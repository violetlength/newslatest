# Vercel部署指南

## 问题解决

部署到Vercel后，API请求路径如 `https://newslatest-ten.vercel.app/api/juejin/content_api/v1/content/article_rank` 会无法访问，因为缺少API代理。

## 解决方案

### 1. 已创建的文件

- `api/[...slug].ts` - 通用API代理
- `vercel.json` - Vercel配置
- `src/types/vercel.d.ts` - 类型定义

### 2. 部署步骤

1. **确保文件结构正确**
   ```
   project/
   ├── api/
   │   └── [...slug].ts
   ├── dist/
   ├── vercel.json
   └── package.json
   ```

2. **环境变量设置**
   在Vercel控制台设置环境变量：
   - `NODE_ENV=production`

3. **部署命令**
   ```bash
   # 本地测试
   npm run build
   
   # 部署到Vercel
   vercel --prod
   ```

### 3. API代理工作原理

请求流程：
```
前端请求: /api/juejin/content_api/v1/content/article_rank
    ↓
Vercel路由: api/[...slug].ts
    ↓
代理到: https://api.juejin.cn/content_api/v1/content/article_rank
```

### 4. 支持的API

- `/api/bilibili/*` → `https://api.bilibili.com/*`
- `/api/weibo/*` → `https://weibo.com/*`
- `/api/zhihu/*` → `https://api.zhihu.com/*`
- `/api/github/*` → `https://api.github.com/*`
- `/api/juejin/*` → `https://api.juejin.cn/*`
- `/api/36kr/*` → `https://gateway.36kr.com/*`
- `/api/ithome/*` → `https://m.ithome.com/*`
- `/api/segmentfault/*` → `https://segmentfault.com/*`
- `/api/oschina/*` → `https://www.oschina.net/*`
- `/api/infoq/*` → `https://www.infoq.cn/*`
- `/api/ruanyifeng/*` → `https://www.ruanyifeng.com/*`
- `/api/csdn/*` → `https://blog.csdn.net/*`
- `/api/stcn/*` → `https://www.stcn.com/*`
- `/api/caixin/*` → `https://finance.caixin.com/*`

### 5. 错误处理

- 400: API路径不正确或不支持的API
- 500: 目标API请求失败
- CORS: 已配置跨域支持

### 6. 调试方法

1. **查看Vercel日志**
   ```bash
   vercel logs
   ```

2. **本地测试**
   ```bash
   # 安装Vercel CLI
   npm i -g vercel
   
   # 本地运行
   vercel dev
   ```

3. **检查函数日志**
   在Vercel控制台的Functions标签页查看详细日志

### 7. 注意事项

- API代理会增加请求延迟
- 某些API可能有频率限制
- 建议在生产环境中添加缓存
- 监控API使用量避免超限

### 8. 替代方案

如果Vercel代理有问题，可以考虑：

1. **使用Cloudflare Workers**
2. **自建Node.js代理服务器**
3. **使用其他支持代理的托管平台**

现在你的应用可以在Vercel上正常处理API请求了！
