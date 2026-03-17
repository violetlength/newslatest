import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { WebService } from "../services/web";
import type { NewsSource, NewsSourceConfig } from "../types";

export const useNewsStore = defineStore("news", () => {
  // State
  const newsSources = ref<Map<string, NewsSource>>(new Map());
  const loading = ref<Map<string, boolean>>(new Map());
  const error = ref<Map<string, string>>(new Map());

  // News source configurations
  const newsSourceConfigs: NewsSourceConfig[] = [
    {
      name: "bilibili",
      title: "哔哩哔哩",
      description: "你所热爱的，就是你的生活",
      icon: "VideoPlay",
      color: "#fb7299",
    },
    {
      name: "weibo",
      title: "微博",
      description: "实时热点，每分钟更新一次",
      icon: "ChatDotRound",
      color: "#ff8200",
    },
    {
      name: "zhihu",
      title: "知乎",
      description: "有问题，就会有答案",
      icon: "QuestionFilled",
      color: "#0084ff",
    },
    {
      name: "github",
      title: "GitHub",
      description: "发现全球热门开源项目",
      icon: "Link",
      color: "#24292e",
    },
    {
      name: "juejin",
      title: "掘金",
      description: "帮助开发者成长的社区",
      icon: "Star",
      color: "#1e80ff",
    },
    {
      name: "douyin",
      title: "抖音",
      description: "记录美好生活",
      icon: "VideoCamera",
      color: "#fe2c55",
    },
    {
      name: "36kr",
      title: "36氪",
      description: "让一部分人先看到未来",
      icon: "TrendCharts",
      color: "#ff6900",
    },
    {
      name: "ithome",
      title: "IT之家",
      description: "爱科技，爱这里 - 前沿科技新闻网站",
      icon: "Monitor",
      color: "#c8161e",
    },
    {
      name: "segmentfault",
      title: "思否",
      description: "SegmentFault 思否是中国领先的开发者社区",
      icon: "Code",
      color: "#00965d",
    },
    {
      name: "oschina",
      title: "开源中国",
      description: "开源中国是目前中国最大的开源技术社区",
      icon: "CodeSandbox",
      color: "#0078d7",
    },
    {
      name: "infoq",
      title: "InfoQ",
      description: "InfoQ是一个全球性的技术媒体平台",
      icon: "DocumentText",
      color: "#ff6b35",
    },
    {
      name: "ruanyifeng",
      title: "阮一峰博客",
      description: "阮一峰的科技博客，包含周刊和技术文章",
      icon: "Document",
      color: "#795548",
    },
    {
      name: "csdn",
      title: "CSDN",
      description: "专业开发者社区",
      icon: "Monitor",
      color: "#cc0000",
    },
    {
      name: "stcn",
      title: "证券时报",
      description: "证券时报网要闻频道，提供最新财经要闻",
      icon: "TrendCharts",
      color: "#1890ff",
    },
    {
      name: "caixin",
      title: "财新网",
      description: "财新网金融频道，提供专业财经新闻",
      icon: "Money",
      color: "#ff6900",
    },
  ];

  // Getters
  const getNewsSource = computed(() => (name: string) => {
    return newsSources.value.get(name);
  });

  const isLoading = computed(() => (name: string) => {
    return loading.value.get(name) || false;
  });

  const getError = computed(() => (name: string) => {
    return error.value.get(name);
  });

  const getAvailableSources = computed(() => {
    return newsSourceConfigs.filter(config => 
      newsSources.value.has(config.name)
    );
  });

  // Actions
  async function fetchNewsSource(name: string, noCache: boolean = false) {
    loading.value.set(name, true);
    error.value.delete(name);

    try {
      let newsSource: NewsSource;

      switch (name) {
        case "bilibili":
          newsSource = await WebService.getBilibiliHot(noCache);
          break;
        case "weibo":
          newsSource = await WebService.getWeiboHot(noCache);
          break;
        case "zhihu":
          newsSource = await WebService.getZhihuHot(noCache);
          break;
        case "github":
          newsSource = await WebService.getGithubHot(noCache);
          break;
        case "juejin":
          newsSource = await WebService.getJuejinHot(noCache);
          break;
        case "douyin":
          newsSource = await WebService.getDouyinHot(noCache);
          break;
        case "36kr":
          newsSource = await WebService.get36krHot(noCache);
          break;
        case "ithome":
          newsSource = await WebService.getIthomeHot(noCache);
          break;
        case "segmentfault":
          newsSource = await WebService.getSegmentfaultHot(noCache);
          break;
        case "oschina":
          newsSource = await WebService.getOschinaHot(noCache);
          break;
        case "infoq":
          newsSource = await WebService.getInfoqHot(noCache);
          break;
        case "ruanyifeng":
          newsSource = await WebService.getRuanyifengHot(noCache);
          break;
        case "csdn":
          newsSource = await WebService.getCsdnHot(noCache);
          break;
        case "stcn":
          newsSource = await WebService.getStcnHot(noCache);
          break;
        case "caixin":
          newsSource = await WebService.getCaixinHot(noCache);
          break;
        default:
          throw new Error(`Unknown news source: ${name}`);
      }

      newsSources.value.set(name, newsSource);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      error.value.set(name, errorMessage);
      console.error(`Failed to fetch ${name} news:`, err);
    } finally {
      loading.value.set(name, false);
    }
  }

  async function refreshNewsSource(name: string) {
    await fetchNewsSource(name, true);
  }

  async function fetchAllSources() {
    const promises = newsSourceConfigs.map(config => 
      fetchNewsSource(config.name)
    );
    await Promise.allSettled(promises);
  }

  async function clearAllCache() {
    try {
      const clearedCount = await WebService.clearCache();
      // Clear local state
      newsSources.value.clear();
      error.value.clear();
      loading.value.clear();
      return clearedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Failed to clear cache:", err);
      throw errorMessage;
    }
  }

  function getNewsSourceConfig(name: string): NewsSourceConfig | undefined {
    return newsSourceConfigs.find(config => config.name === name);
  }

  return {
    // State
    newsSources,
    loading,
    error,
    newsSourceConfigs,

    // Getters
    getNewsSource,
    isLoading,
    getError,
    getAvailableSources,

    // Actions
    fetchNewsSource,
    refreshNewsSource,
    fetchAllSources,
    clearAllCache,
    getNewsSourceConfig,
  };
});
