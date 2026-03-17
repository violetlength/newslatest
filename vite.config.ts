import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // 定义环境变量
  define: {
    __API_BASE_URL__: JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? '' // 生产环境直接使用相对路径
        : '' // 开发环境也使用相对路径，由代理处理
    )
  },

  // 开发服务器配置
  server: {
    port: 8085,
    strictPort: true,
    host: true,
    hmr: {
      protocol: "ws",
      host: "0.0.0.0",
      port: 8085,
    },
    // 代理配置解决跨域问题
    proxy: {
      // 哔哩哔哩API代理
      '/api/bilibili': {
        target: 'https://api.bilibili.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/bilibili/, ''),
        headers: {
          'Referer': 'https://www.bilibili.com',
          'Origin': 'https://www.bilibili.com',
        }
      },
      // 微博API代理
      '/api/weibo': {
        target: 'https://weibo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/weibo/, ''),
        headers: {
          'Referer': 'https://weibo.com',
          'Origin': 'https://weibo.com',
        }
      },
      // 知乎API代理
      '/api/zhihu': {
        target: 'https://api.zhihu.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/zhihu/, ''),
        headers: {
          'Referer': 'https://www.zhihu.com',
          'Origin': 'https://www.zhihu.com',
        }
      },
      // GitHub API代理
      '/api/github': {
        target: 'https://api.github.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/github/, ''),
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NewsLatest-App',
        }
      },
      // 掘金API代理
      '/api/juejin': {
        target: 'https://api.juejin.cn',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/juejin/, ''),
        headers: {
          'Referer': 'https://juejin.cn',
          'Origin': 'https://juejin.cn',
        }
      },
      // 抖音API代理
      '/api/douyin': {
        target: 'https://www.douyin.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/douyin/, ''),
        headers: {
          'Referer': 'https://www.douyin.com',
          'Origin': 'https://www.douyin.com',
        }
      },
      // 36氪API代理
      '/api/36kr': {
        target: 'https://gateway.36kr.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/36kr/, ''),
        headers: {
          'Referer': 'https://36kr.com',
          'Origin': 'https://36kr.com',
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      },
      // IT之家API代理
      '/api/ithome': {
        target: 'https://m.ithome.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/ithome/, ''),
        headers: {
          'Referer': 'https://www.ithome.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        }
      },
      // 思否API代理
      '/api/segmentfault': {
        target: 'https://segmentfault.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/segmentfault/, ''),
        headers: {
          'Referer': 'https://segmentfault.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      },
      // 开源中国API代理
      '/api/oschina': {
        target: 'https://www.oschina.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/oschina/, ''),
        headers: {
          'Referer': 'https://www.oschina.net/',
          'Origin': 'https://www.oschina.net',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      },
      // InfoQ API代理
      '/api/infoq': {
        target: 'https://www.infoq.cn',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/infoq/, ''),
        headers: {
          'Referer': 'https://www.infoq.cn',
          'Origin': 'https://www.infoq.cn',
        }
      },
      // 阮一峰博客API代理
      '/api/ruanyifeng': {
        target: 'https://www.ruanyifeng.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/ruanyifeng/, ''),
        headers: {
          'Referer': 'https://www.ruanyifeng.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
      },
      // CSDN API代理
      '/api/csdn': {
        target: 'https://blog.csdn.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/csdn/, ''),
        headers: {
          'Referer': 'https://blog.csdn.net',
          'Origin': 'https://blog.csdn.net',
        }
      },
      // 证券时报API代理
      '/api/stcn': {
        target: 'https://www.stcn.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/stcn/, ''),
        headers: {
          'Referer': 'https://www.stcn.com',
          'Origin': 'https://www.stcn.com',
        }
      },
      // 财新网API代理
      '/api/caixin': {
        target: 'https://finance.caixin.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/caixin/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
      },
    }
  }, 
  build: {
    target: "es2015",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ["vue"],
          "element-plus": ["element-plus"],
          icons: ["@element-plus/icons-vue"],
        },
      },
    },
  },

  // CSS 配置
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "element-plus/theme-chalk/src/mixins/mixins.scss" as *;`,
      },
    },
  },

  // 优化配置
  optimizeDeps: {
    include: ["vue", "element-plus", "@element-plus/icons-vue", "axios", "pinia"],
  },
});
