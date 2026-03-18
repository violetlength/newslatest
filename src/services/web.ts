import axios from "axios";
import type { NewsSource } from "../types";
import { ApiLogger } from "../utils/logger";
import { apiConfig, transformApiUrl, shouldUseDirectApi } from "../config/api";

// 创建axios实例
const api = axios.create({
  timeout: apiConfig.timeout,
  headers: {
    ...apiConfig.headers,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  },
});

// 请求拦截器 - 在生产环境中动态转换API URL
api.interceptors.request.use(
  (config) => {
    if (config.url && shouldUseDirectApi()) {
      const originalUrl = config.url.startsWith('http') 
        ? config.url 
        : `${window.location.origin}${config.url}`;
      
      const transformedUrl = transformApiUrl(originalUrl);
      
      if (transformedUrl !== originalUrl) {
        config.url = transformedUrl;
        ApiLogger.info('URL转换', `转换API URL: ${originalUrl} -> ${transformedUrl}`);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export class WebService { 
  // 简单的内存缓存
  private static cache = new Map<string, { data: NewsSource; expires: number }>();
  
  // API健康检查状态
  private static apiHealthStatus = new Map<string, { healthy: boolean; lastCheck: number; error?: string }>();
  
  private static isExpired(expires: number): boolean {
    return Date.now() > expires;
  }
  
  private static setCache(key: string, data: NewsSource, ttlMinutes: number) {
    const expires = Date.now() + ttlMinutes * 60 * 1000;
    this.cache.set(key, { data, expires });
  }
  
  private static getCache(key: string): NewsSource | null {
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached.expires)) {
      return { ...cached.data, from_cache: true };
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }
  
  // 验证API响应数据
  private static validateNewsSource(data: any, sourceName: string): NewsSource {
    ApiLogger.debug(sourceName, '开始验证API响应数据', { dataType: typeof data });
    
    if (!data || typeof data !== 'object') {
      const error = `${sourceName}: API响应格式无效`;
      ApiLogger.error(sourceName, error, { receivedData: data });
      throw new Error(error);
    }
    
    const newsSource: NewsSource = {
      name: sourceName,
      title: data.title || sourceName,
      description: data.description || '',
      link: data.link || '',
      items: Array.isArray(data.items) ? data.items : [],
      total: typeof data.total === 'number' ? data.total : (Array.isArray(data.items) ? data.items.length : 0),
      from_cache: false,
      update_time: data.update_time || new Date().toISOString(),
    };
    
    // 验证每个新闻项
    const originalItemsCount = newsSource.items.length;
    newsSource.items = newsSource.items.filter((item: any, index: number) => {
      if (!item || typeof item !== 'object') {
        ApiLogger.warn(sourceName, `跳过无效的新闻项 #${index}`, { item });
        return false;
      }
      
      if (!item.id || !item.title || !item.url) {
        ApiLogger.warn(sourceName, `跳过缺少必要字段的新闻项 #${index}`, { 
          missingFields: {
            id: !item.id,
            title: !item.title,
            url: !item.url
          },
          item
        });
        return false;
      }
      
      return true;
    });
    
    const validItemsCount = newsSource.items.length;
    const invalidCount = originalItemsCount - validItemsCount;
    
    ApiLogger.logDataValidation(sourceName, originalItemsCount, validItemsCount, invalidCount);
    
    if (newsSource.items.length === 0) {
      const error = `${sourceName}: 没有有效的新闻数据`;
      ApiLogger.error(sourceName, error, { originalItemsCount, validItemsCount });
      throw new Error(error);
    }
    
    ApiLogger.info(sourceName, `数据验证成功，获取 ${newsSource.items.length} 条新闻`, {
      total: newsSource.items.length,
      fromCache: newsSource.from_cache
    });
    
    return newsSource;
  }
  
  // 更新API健康状态
  private static updateHealthStatus(sourceName: string, healthy: boolean, error?: string) {
    this.apiHealthStatus.set(sourceName, {
      healthy,
      lastCheck: Date.now(),
      error,
    });
  }
  
  // 获取API健康状态
  static getApiHealthStatus(): Record<string, { healthy: boolean; lastCheck: number; error?: string }> {
    const result: Record<string, any> = {};
    this.apiHealthStatus.forEach((status, key) => {
      result[key] = status;
    });
    return result;
  }
  
  // 通用API请求包装器
  private static async fetchWithValidation<T>(
    sourceName: string,
    cacheKey: string,
    apiCall: () => Promise<T>,
    ttlMinutes: number = 60,
    noCache: boolean = false
  ): Promise<NewsSource> {
    if (!noCache) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        ApiLogger.info(sourceName, '使用缓存数据', { cacheKey, ttlMinutes });
        this.updateHealthStatus(sourceName, true);
        return cached;
      }
    }

    const startTime = Date.now();
    let response: T;

    let errorMessage: string | undefined;

    try {
      ApiLogger.info(sourceName, '开始API请求', { cacheKey, ttlMinutes, noCache });
      
      response = await apiCall();

      
      ApiLogger.logApiRequest(sourceName, 'API调用', startTime, true, response);
      
      const newsSource = this.validateNewsSource(response, sourceName);
      this.setCache(cacheKey, newsSource, ttlMinutes);
      this.updateHealthStatus(sourceName, true);
      
      return newsSource;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      ApiLogger.logApiRequest(sourceName, 'API调用', startTime, false, undefined, errorMessage);
      this.updateHealthStatus(sourceName, false, errorMessage);
      
      throw new Error(`获取${sourceName}热门失败: ${errorMessage}`);
    }
  }

  static async getBilibiliHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "哔哩哔哩",
      "bilibili_hot",
      async () => {
        const response = await api.get("/api/bilibili/x/web-interface/ranking/v2?rid=0&type=all");
        
        const json = response.data;
        const items = json.data?.list?.slice(0, 20).map((v: any) => ({
          id: v.bvid,
          title: v.title,
          desc: v.desc,
          cover: v.pic?.replace("http:", "https:"),
          author: v.owner?.name,
          hot: v.stat?.view,
          url: v.short_link_v2 || `https://www.bilibili.com/video/${v.bvid}`,
          mobile_url: `https://m.bilibili.com/video/${v.bvid}`,
        })) || [];

        return {
          name: "bilibili",
          title: "哔哩哔哩",
          description: "你所热爱的，就是你的生活",
          link: "https://www.bilibili.com/v/popular/rank/all",
          items,
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getWeiboHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "微博",
      "weibo_hot",
      async () => {
        const response = await api.get("/api/weibo/ajax/side/hotSearch");
        
        const json = response.data;
        const items = json.data?.realtime?.slice(0, 20).map((v: any, index: number) => ({
          id: v.mid || `weibo-${index}`,
          title: v.word || `热搜${index + 1}`,
          desc: v.word_scheme ? `#${v.word_scheme}#` : undefined,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(v.word || '')}`,
          mobile_url: `https://s.weibo.com/weibo?q=${encodeURIComponent(v.word || '')}`,
        })) || [];

        return {
          name: "weibo",
          title: "微博",
          description: "实时热点，每分钟更新一次",
          link: "https://s.weibo.com/top/summary/",
          items,
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      1,
      noCache
    );
  }

  static async getZhihuHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "知乎",
      "zhihu_hot",
      async () => {
        const response = await api.get("/api/zhihu/topstory/hot-lists/total?limit=50");
        
        const json = response.data;
        const items = json.data?.slice(0, 20).map((v: any) => {
          const target = v.target || v;
          const id = target.id || target.question_id || target.article_id || '';
          const title = target.title || target.question_title || id;
          const excerpt = target.excerpt;
          const hotText = v.detail_text;
          let hot: number | undefined;
          
          if (hotText) {
            const match = hotText.match(/([\d.]+)\s*万?/);
            if (match) {
              const num = parseFloat(match[1]);
              hot = hotText.includes('万') ? Math.floor(num * 10000) : Math.floor(num);
            }
          }
           
          return {
            id: id.toString(),
            title,
            desc: excerpt && excerpt.trim() ? excerpt : undefined,
            url: `https://www.zhihu.com/question/${id}`,
            mobile_url: `https://www.zhihu.com/question/${id}`,
            hot,
          };
        }).filter((item: any) => item.id) || [];

        return {
          name: "zhihu",
          title: "知乎",
          description: "有问题，就会有答案",
          link: "https://www.zhihu.com/hot",
          items,
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getGithubHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "GitHub",
      "github_trending",
      async () => {
        const response = await api.get("/api/github/search/repositories?q=created:>2024-01-01&sort=stars&order=desc&per_page=20");
        
        const json = response.data;
        const items = json.items?.slice(0, 20).map((v: any) => ({
          id: v.id.toString(),
          title: v.full_name,
          desc: v.description ? `${v.description} | ⭐ ${v.stargazers_count || 0} | 📝 ${v.language || 'Unknown'}` : `⭐ ${v.stargazers_count || 0} | 📝 ${v.language || 'Unknown'}`,
          author: v.name,
          hot: v.stargazers_count,
          url: v.html_url,
          mobile_url: v.html_url,
        })) || [];

        return {
          name: "github",
          title: "GitHub",
          description: "发现全球热门开源项目",
          link: "https://github.com/trending",
          items,
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getJuejinHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "掘金",
      "juejin_hot",
      async () => {
        const response = await api.get("/api/juejin/content_api/v1/content/article_rank?category_id=1&type=hot");
        
        const json = response.data;
        const items = json.data?.slice(0, 20).map((v: any) => {
          const content = v.content || {};
          const authorInfo = v.author || {};
          const contentCounter = v.content_counter || {};
          
          return {
            id: content.content_id || '',
            title: content.title || '',
            author: authorInfo.name,
            hot: contentCounter.hot_rank,
            url: `https://juejin.cn/post/${content.content_id}`,
            mobile_url: `https://juejin.cn/post/${content.content_id}`,
          };
        }).filter((item: any) => item.id && item.title) || [];

        return {
          name: "juejin",
          title: "掘金",
          description: "帮助开发者成长的社区",
          link: "https://juejin.cn/hot/articles",
          items,
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getDouyinHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "抖音",
      "douyin_hot",
      async () => {
        const response = await api.get("/api/douyin/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1");
        
        const json = response.data;
        const items = json.data?.word_list?.slice(0, 20).map((v: any) => {
          const word = v.word || '';
          const sentenceId = v.sentence_id || Math.random().toString(36).substr(2, 9);
          
          return {
            id: sentenceId.toString(),
            title: word,
            hot: v.hot_value,
            url: `https://www.douyin.com/hot/${sentenceId}`,
            mobile_url: `https://www.douyin.com/hot/${sentenceId}`,
          };
        }) || [];

        return {
          name: "douyin",
          title: "抖音",
          description: "记录美好生活",
          link: "https://www.douyin.com",
          items,
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async clearCache(): Promise<number> {
    try {
      const clearedCount = this.cache.size;
      this.cache.clear();
      return clearedCount;
    } catch (error) {
      console.error("Failed to clear cache:", error);
      throw new Error("清空缓存失败");
    }
  }

  static async proxyImage(url: string): Promise<Uint8Array> {
    try {
      const response = await api.get(url, {
        responseType: "arraybuffer",
        headers: {
          "Referer": new URL(url).origin,
        }
      });
      return new Uint8Array(response.data);
    } catch (error) {
      console.error("Failed to proxy image:", error);
      throw new Error("图片代理失败");
    }
  }

  static getProxyImageUrl(url: string): string {
    return url;
  }

  // 为其他新闻源提供基础实现
  static async get36krHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "36氪",
      "36kr_hot",
      async () => {
        // 使用36氪的正确API端点 - 基于参考实现
        const response = await api.post("/api/36kr/api/mis/nav/home/nav/rank/hot", {
          partner_id: "wap",
          param: {
            siteId: 1,
            platformId: 2
          },
          timestamp: Date.now()
        }, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
        
        const json = response.data;
        const items = json.data?.hotRankList?.slice(0, 20).map((v: any) => {
          const templateMaterial = v.templateMaterial || {};
          return {
            id: v.itemId || templateMaterial.itemId || '',
            title: templateMaterial.widgetTitle || '',
            desc: templateMaterial.widgetTitle || '', // 36氪没有单独的描述字段
            author: templateMaterial.authorName || '',
            hot: templateMaterial.statRead || templateMaterial.statPraise || 0,
            url: `https://36kr.com/p/${v.itemId}`,
            mobile_url: `https://m.36kr.com/p/${v.itemId}`,
            cover: templateMaterial.widgetImage || '',
            publishTime: v.publishTime || templateMaterial.publishTime,
          };
        }).filter((item: any) => item.id && item.title) || [];

        
        return {
          name: "36kr",
          title: "36氪",
          description: "科技创投媒体，让一部分人先看到未来",
          link: "https://36kr.com/hot-list",
          items,
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getIthomeHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "IT之家",
      "ithome_hot",
      async () => {
        // 使用IT之家的移动端排行榜页面 - 基于参考实现
        const response = await api.get("/api/ithome/rankm/", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.ithome.com/"
          }
        });
        
        const html = response.data;
        
        // HTML解析 - 基于参考实现的CSS选择器
        const items: any[] = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 查找新闻列表项 - 基于实际HTML结构
        const newsItems = doc.querySelectorAll('a[role="option"]');
        
        newsItems.forEach((element, index) => {
          const titleEl = element.querySelector('.plc-title');
          const imgEl = element.querySelector('.plc-image img');
          const timeEl = element.querySelector('.post-time');
          const hotEl = element.querySelector('.review-num');
          
          if (titleEl) {
            const title = titleEl.textContent?.trim() || '';
            const href = element.getAttribute('href') || '';
            const cover = imgEl?.getAttribute('data-original') || imgEl?.getAttribute('src') || '';
            const timeText = timeEl?.textContent?.trim() || '';
            const hotText = hotEl?.textContent?.trim() || '';
            
            // 提取数字热度
            const hot = parseInt(hotText.replace(/\D/g, '')) || 0;
            
            // 构建完整URL
            const url = href.startsWith('http') ? href : `https://www.ithome.com${href}`;
            
            // 从href提取ID
            const idMatch = href.match(/\/(\d+)\.htm/);
            const id = idMatch ? idMatch[1] : `ithome-${index}`;
            
            if (title && href) {
              items.push({
                id,
                title,
                desc: title, // IT之家没有单独的描述
                author: 'IT之家',
                hot,
                url,
                mobile_url: url,
                cover: cover.startsWith('http') ? cover : `https:${cover}`,
                publishTime: timeText,
              });
            }
          }
        });

        return {
          name: "ithome",
          title: "IT之家",
          description: "爱科技，爱这里 - 前沿科技新闻网站",
          link: "https://www.ithome.com",
          items: items.slice(0, 20),
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getSegmentfaultHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "思否",
      "segmentfault_hot",
      async () => {
        // 使用思否的热门问题页面 - 基于参考实现
        const response = await api.get("/api/segmentfault/questions/hottest/weekly", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
        
        const html = response.data;
        
        // 简单的HTML解析 - 提取问题信息
        const items: any[] = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 查找问题列表项
        const questionItems = doc.querySelectorAll('.question-item, .list-group-item, article');
        
        questionItems.forEach((item, index) => {
          const titleEl = item.querySelector('h2, .title, a');
          const linkEl = item.querySelector('a');
          const authorEl = item.querySelector('.author, .user-name');
          const viewsEl = item.querySelector('.views, .view-count');
          
          if (titleEl && linkEl) {
            const title = titleEl.textContent?.trim() || '';
            const url = linkEl.getAttribute('href') || '';
            const author = authorEl?.textContent?.trim() || '';
            const viewsText = viewsEl?.textContent?.trim() || '';
            const hot = parseInt(viewsText.replace(/\D/g, '')) || 0;
            
            if (title && url) {
              items.push({
                id: `sf-${index}`,
                title,
                desc: title, // 思否的问题标题本身就是描述
                author,
                hot,
                url: url.startsWith('http') ? url : `https://segmentfault.com${url}`,
                mobile_url: url.startsWith('http') ? url : `https://segmentfault.com${url}`,
              });
            }
          }
        });

        return {
          name: "segmentfault",
          title: "思否",
          description: "SegmentFault 思否是中国领先的开发者社区，为开发者提供技术问答、文章分享、技术资讯等服务。",
          link: "https://segmentfault.com",
          items: items.slice(0, 20),
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getOschinaHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "开源中国",
      "oschina_hot",
      async () => {
        // 使用开源中国的新闻列表API - 基于参考实现
        const response = await api.get("/api/oschina/action/ajax/get_more_news_list?newsType=1&p=1&pageSize=20", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.oschina.net/",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
        
        const html = response.data;
        
        // 打印原始HTML数据用于调试
        console.log('开源中国原始HTML数据:', html);
        
        // HTML解析 - 基于参考实现的CSS选择器
        const items: any[] = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 查找新闻列表项 - 使用正确的选择器
        const newsItems = doc.querySelectorAll('div.item.box');
        console.log('开源中国找到新闻项数量:', newsItems.length);
        
        newsItems.forEach((element, index) => {
          const titleEl = element.querySelector('a.title span.text-ellipsis');
          const linkEl = element.querySelector('a.title');
          const authorEl = element.querySelector('div.from span.mr a');
          const dateEl = element.querySelector('div.from span.mr');
          
          // 获取标题
          const title = titleEl?.textContent?.trim() || '';
          if (title === '') {
            console.log(`跳过空标题的新闻项 ${index + 1}`);
            return;
          }
          
          // 获取链接
          const href = linkEl?.getAttribute('href') || '';
          
          // 生成ID
          const id = href || `oschina_${index}`;
          
          // 获取作者
          const author = authorEl?.textContent?.trim() || '';
          
          // 获取日期 - 按照Rust版本的逻辑
          let publishTime = '';
          if (dateEl) {
            // 获取span.mr的完整文本内容（包括子元素的文本）
            const fullText = Array.from(dateEl.childNodes)
              .map(node => node.textContent || '')
              .join('')
              .trim();
            
            console.log(`新闻项 ${index + 1} span.mr 完整文本: "${fullText}"`);
            
            // 从格式"局 发布于 2026-02-28"中获取第二个空格之后的日期
            const parts = fullText.split(/\s+/);
            if (parts.length >= 3) {
              // 格式：[作者, "发布于", "2026-02-28"]
              publishTime = parts[2].trim();
            } else {
              // 如果格式不符合预期，尝试查找"发布于"后面的内容
              const publishIndex = fullText.indexOf('发布于');
              if (publishIndex !== -1) {
                const datePart = fullText.substring(publishIndex + 3).trim();
                publishTime = datePart;
              } else {
                // 如果没有"发布于"，直接取整个文本
                publishTime = fullText;
              }
            }
          }
          
          // 构建完整URL
          const url = href.startsWith('http') ? href : `https://www.oschina.net${href}`;
          const mobileUrl = href.startsWith('http') ? 
            href.replace('www.oschina.net', 'm.oschina.net') : 
            `https://m.oschina.net${href}`;
          
          // 打印每个元素的调试信息
          console.log(`新闻项 ${index + 1}:`, {
            id,
            title,
            href,
            author,
            fullDateText: dateEl?.textContent?.trim(),
            publishTime,
            url,
            mobileUrl
          });
          
          if (title && href) {
            const item = {
              id,
              title,
              desc: title, // 开源中国没有单独的描述
              author,
              hot: 0, // 开源中国没有热度数据
              url,
              mobile_url: mobileUrl,
              cover: '', // 开源中国没有封面图
              publishTime,
            };
            console.log(`生成的新闻项 ${index + 1}:`, item);
            items.push(item);
          }
          
          // 限制数量
          if (items.length >= 20) {
            return;
          }
        });

        console.log('开源中国最终解析结果:', {
          totalItems: items.length,
          items: items.slice(0, 5) // 只打印前5个用于调试
        });

        return {
          name: "oschina",
          title: "开源中国",
          description: "开源中国是目前中国最大的开源技术社区，提供最新的开源软件资讯、技术分享和开发者交流平台。",
          link: "https://www.oschina.net",
          items: items.slice(0, 20),
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getInfoqHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "InfoQ",
      "infoq_hot",
      async () => {
        // 使用InfoQ的RSS feed - 基于参考实现
        const response = await api.get("/api/infoq/feed", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
          }
        });
        
        const xml = response.data;
        
        // 打印原始XML数据用于调试
        console.log('InfoQ原始XML数据:', xml);
        
        // RSS解析 - 基于参考实现的CSS选择器
        const items: any[] = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        
        // 查找RSS item
        const newsItems = doc.querySelectorAll('item');
        console.log('InfoQ找到RSS项数量:', newsItems.length);
        
        newsItems.forEach((element, index) => {
          const titleEl = element.querySelector('title');
          const linkEl = element.querySelector('link');
          const authorEl = element.querySelector('author');
          const pubDateEl = element.querySelector('pubDate');
          const guidEl = element.querySelector('guid');
          
          // 获取标题
          const title = titleEl?.textContent?.trim() || '';
          if (title === '') {
            console.log(`跳过空标题的RSS项 ${index + 1}`);
            return;
          }
          
          // 获取链接
          const link = linkEl?.textContent?.trim() || '';
          
          // 获取GUID作为ID
          const guid = guidEl?.textContent?.trim() || '';
          const id = guid || link || `infoq_${index}`;
          
          // 获取作者
          const author = authorEl?.textContent?.trim() || '';
          
          // 获取发布时间并转换为北京时间
          let publishTime = '';
          if (pubDateEl) {
            const timeStr = pubDateEl.textContent?.trim() || '';
            console.log(`RSS项 ${index + 1} 原始时间: "${timeStr}"`);
            
            try {
              // 解析GMT时间格式并转换为北京时间
              const date = new Date(timeStr);
              if (!isNaN(date.getTime())) {
                // 转换为北京时间 (UTC+8)
                const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
                publishTime = beijingTime.toISOString().slice(0, 19).replace('T', ' ');
                console.log(`RSS项 ${index + 1} 转换后北京时间: "${publishTime}"`);
              } else {
                publishTime = timeStr;
              }
            } catch (error) {
              console.log(`RSS项 ${index + 1} 时间解析失败，使用原始字符串`);
              publishTime = timeStr;
            }
          }
          
          // 构建完整URL
          const url = link.startsWith('http') ? link : `https://www.infoq.cn${link}`;
          const mobileUrl = url; // InfoQ使用响应式设计，同一URL适用于移动端
          
          // 打印每个元素的调试信息
          console.log(`RSS项 ${index + 1}:`, {
            id,
            title,
            link,
            author,
            publishTime,
            url
          });
          
          if (title && link) {
            const item = {
              id,
              title,
              desc: title, // InfoQ RSS没有单独的描述
              author,
              hot: 0, // InfoQ RSS没有热度数据
              url,
              mobile_url: mobileUrl,
              cover: '', // InfoQ RSS没有封面图
              publishTime,
            };
            console.log(`生成的RSS项 ${index + 1}:`, item);
            items.push(item);
          }
          
          // 限制数量
          if (items.length >= 20) {
            return;
          }
        });

        console.log('InfoQ最终解析结果:', {
          totalItems: items.length,
          items: items.slice(0, 5) // 只打印前5个用于调试
        });

        return {
          name: "infoq",
          title: "InfoQ",
          description: "InfoQ是一个全球性的技术媒体平台，促进软件开发领域知识与创新的传播",
          link: "https://www.infoq.cn/",
          items: items.slice(0, 20),
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getRuanyifengHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "阮一峰博客",
      "ruanyifeng_weekly",
      async () => {
        // 使用阮一峰博客的存档页面 - 基于参考实现
        const response = await api.get("/api/ruanyifeng/blog/archives.html", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.ruanyifeng.com/"
          }
        });
        
        const html = response.data;
        
        // 打印原始HTML数据用于调试
        console.log('阮一峰博客原始HTML数据:', html);
        
        // HTML解析 - 基于参考实现的CSS选择器
        const items: any[] = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 查找 id="alpha" 容器
        const contentEl = doc.querySelector('#alpha');
        if (!contentEl) {
          console.log('未找到 id=alpha 容器');
          return {
            name: "ruanyifeng",
            title: "阮一峰博客",
            description: "阮一峰的科技博客，包含周刊和技术文章",
            link: "https://www.ruanyifeng.com/blog/",
            items: [],
            total: 0,
            from_cache: false,
            update_time: new Date().toISOString(),
          };
        }
        
        console.log('找到 id=alpha 容器');
        
        // 在 content 容器内查找 class="module-categories" 容器
        const modules = contentEl.querySelectorAll('.module-categories');
        console.log('找到 module-categories 容器数量:', modules.length);
        
        modules.forEach((moduleElement, moduleIndex) => {
          // 在每个容器内查找 li 元素
          const listItems = moduleElement.querySelectorAll('li');
          console.log(`模块 ${moduleIndex + 1} 找到 li 元素数量:`, listItems.length);
          
          listItems.forEach((element, index) => {
            if (index >= 20) {
              return; // 限制最多20条
            }
            
            // 获取标题和链接
            const titleEl = element.querySelector('a');
            if (!titleEl) {
              return;
            }
            
            const title = titleEl.textContent?.trim() || '';
            const href = titleEl.getAttribute('href') || '';
            
            if (title === '') {
              console.log(`跳过空标题的项 ${index + 1}`);
              return;
            }
            
            // 构建完整URL
            const url = href.startsWith('http') ? href : `https://www.ruanyifeng.com${href}`;
            
            // 获取图片信息
            const imgEl = element.querySelector('img');
            let cover = '';
            if (imgEl) {
              const imgSrc = imgEl.getAttribute('src') || '';
              cover = imgSrc.startsWith('http') ? imgSrc : `https://www.ruanyifeng.com${imgSrc}`;
            }
            
            // 获取日期 - 尝试多种日期格式
            let publishTime = '';
            const fullText = element.textContent || '';
            console.log(`项 ${index + 1} 完整文本: "${fullText}"`);
            
            // 查找日期格式
            const datePatterns = [
              /(\d{4}\.\d{1,2}\.\d{1,2})/,  // 2026.02.14 格式
              /(\d{4}-\d{1,2}-\d{1,2})/,    // 2026-02-28 格式
              /(\d{4}年\d{1,2}月\d{1,2}日)/, // 2026年2月28日 格式
              /(\d{1,2}\/\d{1,2}\/\d{4})/,    // 2/28/2026 格式
            ];
            
            for (const pattern of datePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                let dateStr = match[1];
                // 将 2026.02.14 格式转换为 2026-02-14 格式
                publishTime = dateStr.replace(/\./g, '-');
                console.log(`项 ${index + 1} 找到日期: "${publishTime}"`);
                break;
              }
            }
            
            // 打印每个元素的调试信息
            console.log(`项 ${index + 1}:`, {
              title,
              href,
              url,
              cover,
              publishTime
            });
            
            const item = {
              id: url,
              title,
              desc: title, // 阮一峰博客没有单独的描述
              author: '阮一峰',
              hot: 0, // 阮一峰博客没有热度数据
              url,
              mobile_url: url, // 响应式设计
              cover,
              publishTime,
            };
            
            console.log(`生成的项 ${index + 1}:`, item);
            items.push(item);
          });
          
          if (items.length >= 20) {
            return;
          }
        });

        console.log('阮一峰博客最终解析结果:', {
          totalItems: items.length,
          items: items.slice(0, 5) // 只打印前5个用于调试
        });

        return {
          name: "ruanyifeng",
          title: "阮一峰博客",
          description: "阮一峰的科技博客，包含周刊和技术文章",
          link: "https://www.ruanyifeng.com/blog/",
          items: items.slice(0, 20),
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getCsdnHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "CSDN",
      "csdn_hot",
      async () => {
        // 使用CSDN的热门文章API - 基于参考实现
        const response = await api.get("/api/csdn/phoenix/web/blog/hot-rank?page=0&pageSize=30", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://blog.csdn.net/"
          }
        });
        
        const json = response.data;
        
        // 打印原始JSON数据用于调试
        console.log('CSDN原始JSON数据:', json);
        
        // JSON解析 - 基于参考实现的字段映射
        const items = json.data?.slice(0, 20).map((v: any) => {
          const productId = v.productId || '';
          const articleTitle = v.articleTitle || '';
          const nickName = v.nickName || '';
          const articleDetailUrl = v.articleDetailUrl || '';
          const hotRankScore = v.hotRankScore || '0';
          const period = v.period || '';
          
          // 获取封面图 - 从picList数组中取第一张
          let cover = '';
          if (v.picList && Array.isArray(v.picList) && v.picList.length > 0) {
            cover = v.picList[0];
          }
          
          // 处理时间 - period格式为"年-月-日-时"，如"2026-03-02-08"
          let publishTime = '';
          if (period && period.includes('-')) {
            const parts = period.split('-');
            if (parts.length === 4) {
              const [year, month, day, hour] = parts;
              // 验证数字格式
              if (!isNaN(Number(year)) && !isNaN(Number(month)) && !isNaN(Number(day)) && !isNaN(Number(hour))) {
                publishTime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:00:00`;
              }
            }
          }
          
          // 转换热度分数
          const hot = parseFloat(hotRankScore) || 0;
          
          // 构建移动端URL
          const mobileUrl = articleDetailUrl.replace('blog.csdn.net', 'm.blog.csdn.net');
          
          // 打印每个元素的调试信息
          console.log('CSDN文章:', {
            id: productId,
            title: articleTitle,
            author: nickName,
            url: articleDetailUrl,
            mobileUrl,
            cover,
            publishTime,
            hot
          });
          
          return {
            id: productId,
            title: articleTitle,
            desc: articleTitle, // CSDN没有单独的描述
            author: nickName,
            hot,
            url: articleDetailUrl,
            mobile_url: mobileUrl,
            cover,
            publishTime,
          };
        }).filter((item: any) => item.id && item.title) || [];

        console.log('CSDN最终解析结果:', {
          totalItems: items.length,
          items: items.slice(0, 5) // 只打印前5个用于调试
        });

        return {
          name: "csdn",
          title: "CSDN",
          description: "IT技术社区，专业IT技术分享平台",
          link: "https://blog.csdn.net",
          items,
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60,
      noCache
    );
  }

  static async getStcnHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "证券时报",
      "stcn_hot",
      async () => {
        // 使用证券时报的新闻列表页面 - 基于参考实现
        const response = await api.get("/api/stcn/article/list/yw.html", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.stcn.com/"
          }
        });
        
        const html = response.data;
        
        // 打印原始HTML数据用于调试
        console.log('证券时报原始HTML数据:', html);
        
        // HTML解析 - 基于参考实现的CSS选择器
        const items: any[] = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 查找新闻列表项 - 使用正确的选择器
        const newsItems = doc.querySelectorAll('.list-page-tab-content.active .list.infinite-list li');
        console.log('证券时报找到新闻项数量:', newsItems.length);
        
        newsItems.forEach((element, index) => {
          // 提取标题和链接 - 从a标签中获取
          const linkEl = element.querySelector('a');
          
          if (!linkEl) {
            console.log(`证券时报第${index + 1}个元素没有找到链接`);
            return;
          }
          
          const title = linkEl.textContent?.trim() || '';
          const href = linkEl.getAttribute('href') || '';
          
          if (title === '') {
            console.log(`证券时报第${index + 1}条标题为空，跳过`);
            return;
          }
          
          // 构建完整URL
          const url = href.startsWith('http') ? href : `https://www.stcn.com${href}`;
          const mobileUrl = href.startsWith('http') ? 
            href.replace('www.stcn.com', 'm.stcn.com') : 
            `https://m.stcn.com${href}`;
          
          // 提取时间 - 从span或其他时间元素中获取
          let publishTime = '';
          const timeEl = element.querySelector('.time, .date, .publish-time, span');
          if (timeEl) {
            publishTime = timeEl.textContent?.trim() || '';
          }
          
          // 提取封面图片
          const imgEl = element.querySelector('img');
          let cover = '';
          if (imgEl) {
            const imgSrc = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
            cover = imgSrc.startsWith('http') ? imgSrc : `https://www.stcn.com${imgSrc}`;
          }
          
          // 打印每个元素的调试信息
          console.log(`证券时报文章 ${index + 1}:`, {
            title,
            href,
            url,
            mobileUrl,
            publishTime,
            cover
          });
          
          const item = {
            id: url,
            title,
            desc: title, // 证券时报没有单独的描述
            author: '证券时报',
            hot: 0, // 证券时报没有热度数据
            url,
            mobile_url: mobileUrl,
            cover,
            publishTime,
          };
          
          console.log(`生成的证券时报文章 ${index + 1}:`, item);
          items.push(item);
          
          // 限制数量
          if (items.length >= 20) {
            return;
          }
        });

        console.log('证券时报最终解析结果:', {
          totalItems: items.length,
          items: items.slice(0, 5) // 只打印前5个用于调试
        });

        return {
          name: "stcn",
          title: "证券时报",
          description: "证券时报网要闻频道，提供最新财经要闻",
          link: "https://www.stcn.com/article/list/yw.html",
          items: items.slice(0, 20),
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      30, // 证券时报30分钟TTL
      noCache
    );
  }

  static async getCaixinHot(noCache: boolean = false): Promise<NewsSource> {
    return this.fetchWithValidation(
      "财新网",
      "caixin_hot",
      async () => {
        // 使用财新网金融频道页面 - 基于Rust代码参考
        const response = await api.get('/api/caixin/', {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://finance.caixin.com/"
          }
        });
        
        const html = response.data;
        
        // 打印原始HTML数据用于调试
        console.log('财新网原始HTML数据长度:', html.length);
        console.log('财新网原始HTML数据:', html);
        
        // HTML解析 - 基于Rust代码的解析策略
        const items: any[] = [];
        
        // 在浏览器环境中使用DOMParser
        if (typeof DOMParser !== 'undefined') {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          console.log('财新网开始解析页面结构...');
          
          // 查找id为listArticle的容器 - 基于Rust代码
          const listContainer = doc.querySelector('#listArticle');
          if (!listContainer) {
            console.log('财新网未找到#listArticle容器，尝试备用方法...');
            
            // 备用方法：查找其他可能的容器
            const fallbackContainers = [
              '.news_list',
              '.content-list', 
              '.article-list',
              '.news-content',
              '.content',
              'main'
            ];
            
            let foundContainer = null;
            for (const selector of fallbackContainers) {
              const container = doc.querySelector(selector);
              if (container) {
                console.log(`财新网找到备用容器: ${selector}`);
                foundContainer = container;
                break;
              }
            }
            
            if (!foundContainer) {
              console.log('财新网未找到任何新闻容器，返回空结果');
              return {
                name: "caixin",
                title: "财新网",
                description: "财新网金融频道，提供专业财经新闻",
                link: "https://finance.caixin.com/",
                items: [],
                total: 0,
                from_cache: false,
                update_time: new Date().toISOString(),
              };
            }
            
            // 使用备用容器进行解析
            const newsItems = foundContainer.querySelectorAll('.boxa, .item, article, .news-item, dl');
            console.log('财新网备用容器找到新闻项数量:', newsItems.length);
            
            newsItems.forEach((element, index) => {
              if (index >= 20) return; // 限制20条
              
              const titleLink = element.querySelector('h4 a, .title a, h2 a, h3 a, a');
              const title = titleLink?.textContent?.trim() || '';
              const href = titleLink?.getAttribute('href') || '';
              
              if (title && href) {
                const url = href.startsWith('http') ? href : `https://finance.caixin.com${href}`;
                const mobileUrl = url.replace('finance.caixin.com', 'm.caixin.com');
                
                // 查找图片
                let cover = '';
                const img = element.querySelector('.pic img, img');
                if (img) {
                  const imgSrc = img.getAttribute('data-src') || img.getAttribute('src') || '';
                  cover = imgSrc.startsWith('http') ? imgSrc : `https://finance.caixin.com${imgSrc}`;
                }
                
                // 查找时间和作者
                let publishTime = '';
                let author = '财新网';
                const spanEl = element.querySelector('span');
                if (spanEl) {
                  const spanText = spanEl.textContent?.trim() || '';
                  if (spanText.includes('｜')) {
                    // 格式: "文｜财新 张宇哲 2026年03月03日 20:17"
                    const parts = spanText.split('｜');
                    if (parts.length >= 2) {
                      author = parts[0].replace('文', '').trim();
                      publishTime = parts[1].trim();
                    }
                  } else {
                    publishTime = spanText;
                  }
                }
                
                // 查找描述
                let desc = '';
                const pEl = element.querySelector('p');
                if (pEl) {
                  const pText = pEl.textContent?.trim() || '';
                  if (pText.length > 0) {
                    desc = pText.length > 200 ? pText.substring(0, 200) + '...' : pText;
                  }
                }
                
                items.push({
                  id: `caixin_${index + 1}`,
                  title,
                  desc: desc || title,
                  author,
                  hot: 0,
                  url,
                  mobile_url: mobileUrl,
                  cover,
                  publishTime,
                  source: '财新网'
                });
              }
            });
          } else {
            // 使用#listArticle容器进行解析 - 基于Rust代码
            console.log('财新网找到#listArticle容器');
            
            // 在listArticle容器内查找class为boxa的新闻项
            const newsItems = listContainer.querySelectorAll('.boxa');
            console.log('财新网找到.boxa新闻项数量:', newsItems.length);
            
            newsItems.forEach((element, index) => {
              if (index >= 20) return; // 限制20条
              
              // 提取标题 - 从h4 a中获取
              const titleLink = element.querySelector('h4 a');
              const title = titleLink?.textContent?.trim() || '';
              
              if (title === '') {
                console.log(`财新网跳过空标题的项 ${index + 1}`);
                return;
              }
              
              // 提取链接 - 从h4 a中获取
              const href = titleLink?.getAttribute('href') || '';
              const url = href.startsWith('http') ? href : `https://finance.caixin.com${href}`;
              const mobileUrl = url.replace('finance.caixin.com', 'm.caixin.com');
              
              // 提取封面图片 - 从.pic img中获取
              let cover = '';
              const img = element.querySelector('.pic img');
              if (img) {
                const imgSrc = img.getAttribute('data-src') || img.getAttribute('src') || '';
                cover = imgSrc.startsWith('http') ? imgSrc : `https://finance.caixin.com${imgSrc}`;
              }
              
              // 提取时间戳和作者 - 从span中获取
              let publishTime = '';
              let author = '财新网';
              const spanEl = element.querySelector('span');
              if (spanEl) {
                const spanText = spanEl.textContent?.trim() || '';
                if (spanText.includes('｜')) {
                  // 格式: "文｜财新 张宇哲 2026年03月03日 20:17"
                  const parts = spanText.split('｜');
                  if (parts.length >= 2) {
                    author = parts[0].replace('文', '').trim();
                    publishTime = parts[1].trim();
                  }
                } else {
                  publishTime = spanText;
                }
              }
              
              // 提取描述 - 从p标签中获取
              let desc = '';
              const pEl = element.querySelector('p');
              if (pEl) {
                const pText = pEl.textContent?.trim() || '';
                if (pText.length > 0) {
                  desc = pText.length > 200 ? pText.substring(0, 200) + '...' : pText;
                }
              }
              
              console.log(`财新网文章 ${index + 1}:`, {
                title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
                url: url.substring(0, 50) + (url.length > 50 ? '...' : ''),
                hasCover: !!cover,
                author,
                publishTime
              });
              
              items.push({
                id: `caixin_${index + 1}`,
                title,
                desc: desc || title,
                author,
                hot: 0,
                url,
                mobile_url: mobileUrl,
                cover,
                publishTime,
                source: '财新网'
              });
            });
          }
        } else {
          // 备用方案：使用正则表达式解析（适用于非浏览器环境）
          const titleRegex = /<h4[^>]*><a[^>]*>([^<]+)<\/a><\/h4>/g;
          const hrefRegex = /<h4[^>]*><a[^>]*href="([^"]*)"[^>]*>/g;
          
          const titles = [...html.matchAll(titleRegex)].map(m => m[1].trim());
          const hrefs = [...html.matchAll(hrefRegex)].map(m => m[1]);
          
          for (let i = 0; i < Math.min(titles.length, hrefs.length, 20); i++) {
            const title = titles[i];
            const href = hrefs[i];
            
            if (title && href) {
              const url = href.startsWith('http') ? href : `https://finance.caixin.com${href}`;
              const mobileUrl = url.replace('finance.caixin.com', 'm.caixin.com');
              
              items.push({
                id: `caixin_${i + 1}`,
                title,
                desc: title,
                author: '财新网',
                hot: 0,
                url,
                mobile_url: mobileUrl,
                cover: '',
                publishTime: new Date().toLocaleString(),
                source: '财新网'
              });
            }
          }
        }

        console.log('财新网最终解析结果:', {
          totalItems: items.length,
          items: items.slice(0, 5) // 只打印前5个用于调试
        });

        return {
          name: "caixin",
          title: "财新网",
          description: "财新网金融频道，提供专业财经新闻",
          link: "https://finance.caixin.com/",
          items: items.slice(0, 20),
          total: items.length,
          from_cache: false,
          update_time: new Date().toISOString(),
        };
      },
      60, // 财新网60分钟TTL
      noCache
    );
  }
}
