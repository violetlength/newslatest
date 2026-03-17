// 通用Vercel API代理 - 处理所有API请求
import type { VercelRequest, VercelResponse } from '../src/types/vercel';

// API目标配置
const API_TARGETS: Record<string, string> = {
  'bilibili': 'https://api.bilibili.com',
  'weibo': 'https://weibo.com',
  'zhihu': 'https://api.zhihu.com',
  'github': 'https://api.github.com',
  'juejin': 'https://api.juejin.cn',
  'douyin': 'https://www.douyin.com',
  '36kr': 'https://gateway.36kr.com',
  'ithome': 'https://m.ithome.com',
  'segmentfault': 'https://segmentfault.com',
  'oschina': 'https://www.oschina.net',
  'infoq': 'https://www.infoq.cn',
  'ruanyifeng': 'https://www.ruanyifeng.com',
  'csdn': 'https://blog.csdn.net',
  'stcn': 'https://www.stcn.com',
  'caixin': 'https://finance.caixin.com',
};

// 默认请求头配置
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

// 特定API的请求头配置
const API_HEADERS: Record<string, Record<string, string>> = {
  'bilibili': {
    'Referer': 'https://www.bilibili.com',
    'Origin': 'https://www.bilibili.com',
  },
  'weibo': {
    'Referer': 'https://weibo.com',
    'Origin': 'https://weibo.com',
  },
  'zhihu': {
    'Referer': 'https://www.zhihu.com',
    'Origin': 'https://www.zhihu.com',
  },
  'github': {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'NewsLatest-App',
  },
  'juejin': {
    'Referer': 'https://juejin.cn',
    'Origin': 'https://juejin.cn',
  },
  '36kr': {
    'Referer': 'https://36kr.com',
    'Origin': 'https://36kr.com',
    'Content-Type': 'application/json',
  },
  'ithome': {
    'Referer': 'https://www.ithome.com/',
  },
  'segmentfault': {
    'Referer': 'https://segmentfault.com/',
  },
  'oschina': {
    'Referer': 'https://www.oschina.net/',
    'Origin': 'https://www.oschina.net',
  },
  'infoq': {
    'Referer': 'https://www.infoq.cn',
    'Origin': 'https://www.infoq.cn',
  },
  'ruanyifeng': {
    'Referer': 'https://www.ruanyifeng.com/',
  },
  'csdn': {
    'Referer': 'https://blog.csdn.net',
    'Origin': 'https://blog.csdn.net',
  },
  'stcn': {
    'Referer': 'https://www.stcn.com',
    'Origin': 'https://www.stcn.com',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const slug = req.query.slug as string[];
    if (!slug || slug.length === 0) {
      return res.status(400).json({ error: 'API路径不能为空' });
    }

    const [apiName, ...pathParts] = slug;
    const targetBase = API_TARGETS[apiName];
    
    if (!targetBase) {
      return res.status(400).json({ error: `不支持的API: ${apiName}` });
    }

    const path = '/' + pathParts.join('/');
    const queryString = new URLSearchParams(req.query as any).toString();
    const targetUrl = `${targetBase}${path}${queryString ? '?' + queryString : ''}`;

    // 构建请求头
    const headers = {
      ...DEFAULT_HEADERS,
      ...API_HEADERS[apiName],
    };

    // 构建请求选项
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    // 如果是POST/PUT请求，添加请求体
    if (['POST', 'PUT'].includes(req.method || '') && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    console.log(`代理请求: ${req.method} ${targetUrl}`);

    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 复制一些响应头
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    return res.status(response.status).send(data);
  } catch (error) {
    console.error('API代理错误:', error);
    return res.status(500).json({
      error: 'API请求失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
}
