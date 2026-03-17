# 部署配置说明

## 环境配置

### 开发环境
- 使用 Vite 开发服务器代理
- 所有 `/api/*` 请求自动代理到对应的目标服务器
- 无需额外配置

### 生产环境

#### 1. 直接部署（推荐）
```bash
npm run build
```
- 构建后的文件可以直接部署到任何静态文件服务器
- API请求使用相对路径，需要后端服务器处理CORS

#### 2. 部署到特定域名
如果部署到 `https://your-domain.com`，需要：

1. 更新 `.env.production`：
```env
VITE_API_BASE_URL=https://your-domain.com/api
```

2. 配置后端代理服务器（Nginx示例）：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api/bilibili/ {
        proxy_pass https://api.bilibili.com/;
        proxy_set_header Referer https://www.bilibili.com;
        proxy_set_header Origin https://www.bilibili.com;
    }
    
    location /api/weibo/ {
        proxy_pass https://weibo.com/;
        proxy_set_header Referer https://weibo.com;
        proxy_set_header Origin https://weibo.com;
    }
    
    # 其他API代理配置...
}
```

#### 3. 使用CDN部署
如果使用CDN，需要配置：
- CDN回源到主服务器
- API请求路由到后端代理服务器

## CORS配置

如果前端和后端分离部署，需要在后端服务器配置CORS：

```nginx
# 在nginx配置中添加
add_header Access-Control-Allow-Origin *;
add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
```

## 环境变量说明

| 变量名 | 说明 | 开发环境 | 生产环境 |
|--------|------|----------|----------|
| `VITE_APP_TITLE` | 应用标题 | 开发版本 | 正式版本 |
| `VITE_APP_BASE_URL` | 应用基础URL | localhost | 域名 |
| `VITE_API_BASE_URL` | API基础URL | 空（使用代理） | 域名或空 |

## 常见部署场景

### 1. Vercel/Netlify
- 直接部署静态文件
- 需要配置Serverless Functions处理API代理

### 2. 传统服务器
- 使用Nginx/Apache作为反向代理
- 配置CORS和API路由

### 3. Docker部署
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 注意事项

1. **API限制**：某些API有频率限制，生产环境需要考虑缓存策略
2. **安全性**：生产环境应隐藏API密钥和敏感信息
3. **性能**：建议使用CDN加速静态资源
4. **监控**：配置错误监控和日志收集
