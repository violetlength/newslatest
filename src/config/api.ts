// API配置文件 - 处理不同环境下的请求路径

// API基础配置
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

// 开发环境配置
const developmentConfig: ApiConfig = {
  baseURL: '', // 开发环境使用相对路径，由Vite代理处理
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// 生产环境配置
const productionConfig: ApiConfig = {
  baseURL: '', // 生产环境使用相对路径或配置的域名
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// 根据环境获取配置
function getConfig(): ApiConfig {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  if (isDevelopment) {
    return {
      ...developmentConfig,
      baseURL: apiBaseUrl || '' // 开发环境使用代理，baseURL为空
    };
  } else if (isProduction) {
    return {
      ...productionConfig,
      baseURL: apiBaseUrl || '' // 生产环境使用配置的域名或相对路径
    };
  } else {
    // 测试环境或其他环境
    return developmentConfig;
  }
}

// API路径映射
export const API_ENDPOINTS = {
  // 哔哩哔哩
  BILIBILI: {
    HOT: '/api/bilibili/x/web-interface/popular',
    SEARCH: '/api/bilibili/x/web-interface/search/all/v2',
  },
  
  // 微博
  WEIBO: {
    HOT: '/api/weibo/ajax/side/hotSearch',
    SEARCH: '/api/weibo/ajax/search/all',
  },
  
  // 知乎
  ZHIHU: {
    HOT: '/api/zhihu/api/v4/feed/topstory/hot-lists/total',
    SEARCH: '/api/zhihu/api/v4/search/suggest',
  },
  
  // GitHub
  GITHUB: {
    TRENDING: '/api/github/search/repositories',
    SEARCH: '/api/github/search/repositories',
  },
  
  // 掘金
  JUEJIN: {
    HOT: '/api/juejin/recommend_api/v1/article/recommend_all_feed',
    SEARCH: '/api/juejin/search_api/v1/search',
  },
  
  // 36氪
  KR36: {
    NEWS: '/api/36kr/mobility/article/list',
    SEARCH: '/api/36kr/mobility/search',
  },
  
  // IT之家
  ITHOME: {
    NEWS: '/api/ithome/ajax/newslist',
    SEARCH: '/api/ithome/ajax/search',
  },
  
  // 思否
  SEGMENTFAULT: {
    HOT: '/api/segmentfault/hottest',
    SEARCH: '/api/segmentfault/search',
  },
  
  // 开源中国
  OSCHINA: {
    NEWS: '/api/oschina/news/list',
    SEARCH: '/api/oschina/search',
  },
  
  // InfoQ
  INFOQ: {
    NEWS: '/api/infoq/api/v1/articles',
    SEARCH: '/api/infoq/api/v1/search',
  },
  
  // 阮一峰博客
  RUANYIFENG: {
    BLOG: '/api/ruanyifeng/blog',
    SEARCH: '/api/ruanyifeng/search',
  },
  
  // CSDN
  CSDN: {
    HOT: '/api/csdn/phoenix/article',
    SEARCH: '/api/csdn/search',
  },
  
  // 证券时报
  STCN: {
    NEWS: '/api/stcn/api/news',
    SEARCH: '/api/stcn/api/search',
  },
  
  // 财新网
  CAIXIN: {
    NEWS: '/api/caixin/api/news',
    SEARCH: '/api/caixin/api/search',
  }
} as const;

// 获取完整的API URL
export function getApiUrl(endpoint: string): string {
  const config = getConfig();
  return `${config.baseURL}${endpoint}`;
}

// 获取API配置
export const apiConfig = getConfig();

// 导出环境信息
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const isTest = import.meta.env.MODE === 'test';
