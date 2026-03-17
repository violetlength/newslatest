<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { Link, View, Clock, Star } from "@element-plus/icons-vue";
import type { NewsSource } from "../types";
import { WebService } from "../services/web";

interface Props {
  activeSource: string;
  newsSource?: NewsSource;
  loading: boolean;
  error?: string;
}

const props = defineProps<Props>();

// 抽屉相关状态
const drawerVisible = ref(false);
const currentUrl = ref('');
const currentTitle = ref('');
const iframeLoading = ref(false);
const iframeError = ref('');
const displayMode = ref<'url' | 'iframe'>('iframe'); // 'url' | 'iframe'

// 滚动容器引用
const contentBodyRef = ref<HTMLElement>();
const iframeRef = ref<HTMLIFrameElement>();

const formattedUpdateTime = computed(() => {
  if (!props.newsSource?.update_time) return "";
  const date = new Date(props.newsSource.update_time);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
});

function formatHotCount(hot?: number): string {
  if (!hot) return "";
  if (hot >= 10000) {
    return `${(hot / 10000).toFixed(1)}万`;
  }
  return hot.toLocaleString();
}

// 处理图片加载错误，使用代理
async function handleImageError(event: Event, originalUrl: string) {
  const img = event.target as HTMLImageElement;
  
  try {
    // 通过Web代理获取图片
    const imageData = await WebService.proxyImage(originalUrl);
    
    // 检查数据是否存在
    if (!imageData) {
      throw new Error('No image data received');
    }
    
    // 创建Blob - 使用类型断言解决TypeScript类型检查问题
    const blob = new Blob([imageData as BlobPart], { type: 'image/jpeg' });
    const blobUrl = URL.createObjectURL(blob);
    
    // 设置新的src
    img.src = blobUrl;
    
    // 清理blob URL（当图片不再需要时）
    img.onload = () => {
      // 延迟清理，确保图片已加载
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    };
  } catch (error) {
    console.error("Failed to proxy image:", error);
    // 设置一个默认图片
    img.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mHPC90ZXh0Pjwvc3ZnPg==";
  }
}

// 打开抽屉显示URL
function openUrlDrawer(url: string, title: string) {
  currentUrl.value = url;
  currentTitle.value = title;
  iframeLoading.value = true;
  iframeError.value = '';
  displayMode.value = 'iframe';
  drawerVisible.value = true;
}

// 关闭抽屉
function closeDrawer() {
  drawerVisible.value = false;
  currentUrl.value = '';
  currentTitle.value = '';
  iframeLoading.value = false;
  iframeError.value = '';
  displayMode.value = 'iframe';
}

// iframe加载完成
function onIframeLoad() {
  iframeLoading.value = false;
  iframeError.value = '';
}

// iframe加载错误
function onIframeError() {
  iframeLoading.value = false;
  iframeError.value = '新闻页面加载失败，可能是由于跨域限制或网络问题';
  console.error('Failed to load iframe:', currentUrl.value);
}

// 切换显示模式
function toggleDisplayMode() {
  displayMode.value = displayMode.value === 'iframe' ? 'url' : 'iframe';
  if (displayMode.value === 'iframe') {
    iframeLoading.value = true;
    iframeError.value = '';
  }
}

// 监听数据源变化，滚动到顶部
watch(() => props.activeSource, async () => {
  await nextTick();
  if (contentBodyRef.value) {
    contentBodyRef.value.scrollTop = 0;
  }
});

// 监听loading状态变化，当数据加载完成时也滚动到顶部
watch(() => props.loading, async (newLoading, oldLoading) => {
  // 从加载中变为加载完成时，滚动到顶部
  if (oldLoading && !newLoading && contentBodyRef.value) {
    await nextTick();
    contentBodyRef.value.scrollTop = 0;
  }
});

function openUrl(url: string) {
  // 移动端使用window.open，或者可以考虑其他方式
  window.open(url, "_blank");
}
</script>

<template>
  <main class="android-content">
    <div class="content-header">
      <div class="source-info">
        <h2>{{ newsSource?.title || "加载中..." }}</h2>
        <p class="description">{{ newsSource?.description }}</p>
        <div class="meta">
          <span class="update-time">
            <el-icon><Clock /></el-icon>
            {{ formattedUpdateTime }}
          </span>
          <span class="cache-status" :class="{ from_cache: newsSource?.from_cache }">
            {{ newsSource?.from_cache ? "来自缓存" : "最新数据" }}
          </span>
          <span class="total-count">
            共 {{ newsSource?.total || 0 }} 条
          </span>
        </div>
      </div>
    </div>

    <div class="content-body" ref="contentBodyRef">
      <el-skeleton v-if="loading" :rows="8" animated />
      
      <el-empty v-else-if="error" description="加载失败">
        <template #image>
          <el-icon><View /></el-icon>
        </template>
        <p>{{ error }}</p>
      </el-empty>

      <div v-else-if="newsSource" class="news-list">
        <div
          v-for="item in newsSource.items"
          :key="item.id"
          class="news-item"
          @click="openUrlDrawer(item.url, item.title)"
        >
          <div class="item-content">
            <div class="item-main">
              <h3 class="item-title">{{ item.title }}</h3>
              <p v-if="item.desc" class="item-desc">{{ item.desc }}</p>
              <div class="item-meta">
                <span v-if="item.author" class="author">{{ item.author }}</span>
                <span v-if="item.timestamp" class="timestamp">{{ item.timestamp }}</span>
                <span v-if="item.hot" class="hot">
                  <el-icon><Star /></el-icon>
                  {{ formatHotCount(item.hot) }}
                </span>
              </div>
            </div>
            <div v-if="item.cover" class="item-cover">
              <img
                :src="item.cover"
                :alt="item.title"
                @error="handleImageError($event, item.cover!)"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      <el-empty v-else description="暂无数据" />
    </div>

    <!-- 新闻内容抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      direction="btt"
      size="85%"
      :show-close="true"
      :title="currentTitle"
      class="news-drawer"
    >
      <div class="drawer-content">
        <!-- 显示模式切换 -->
        <div class="display-mode-toggle">
          <el-button-group>
            <el-button 
              :type="displayMode === 'iframe' ? 'primary' : 'default'"
              size="small"
              @click="toggleDisplayMode"
            >
              <el-icon><View /></el-icon>
              网页预览
            </el-button>
            <el-button 
              :type="displayMode === 'url' ? 'primary' : 'default'"
              size="small"
              @click="toggleDisplayMode"
            >
              <el-icon><Link /></el-icon>
              链接信息
            </el-button>
          </el-button-group>
        </div>

        <!-- iframe 模式 -->
        <div v-if="displayMode === 'iframe'" class="iframe-container">
          <div v-if="iframeLoading" class="iframe-loading">
            <el-skeleton :rows="8" animated />
            <p class="loading-text">正在加载新闻页面...</p>
          </div>
          
          <div v-else-if="iframeError" class="iframe-error">
            <el-icon><View /></el-icon>
            <p>{{ iframeError }}</p>
            <el-button type="primary" @click="toggleDisplayMode">
              切换到链接模式
            </el-button>
          </div>
          
          <iframe
            v-else
            ref="iframeRef"
            :src="currentUrl"
            class="news-iframe"
            @load="onIframeLoad"
            @error="onIframeError"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
          />
        </div>

        <!-- URL 模式 -->
        <div v-else class="url-content">
          <div class="url-info">
            <p class="url-label">链接地址：</p>
            <div class="url-text">{{ currentUrl }}</div>
          </div>
          <div class="url-actions">
            <el-button type="primary" @click="openUrl(currentUrl)">
              <el-icon><Link /></el-icon>
              在浏览器中打开
            </el-button>
            <el-button @click="toggleDisplayMode">
              <el-icon><View /></el-icon>
              切换到预览模式
            </el-button>
            <el-button @click="closeDrawer">关闭</el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </main>
</template>

<style scoped>
.android-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

.content-header {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 10;
}

.source-info h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #303133;
}

.description {
  margin: 0 0 0.75rem 0;
  color: #606266;
  font-size: 0.9rem;
  line-height: 1.4;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.8rem;
  color: #909399;
}

.meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.cache-status.from_cache {
  color: #e6a23c;
  font-weight: 500;
}

.content-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.news-item {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.news-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

.item-content {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-desc {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: #606266;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #909399;
}

.item-meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.item-cover {
  width: 80px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f7fa;
}

.item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.news-item:hover .item-cover img {
  transform: scale(1.05);
}

.url-content {
  padding: 1rem;
}

.url-info {
  margin-bottom: 1.5rem;
}

.url-label {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #303133;
}

.url-text {
  background: #f5f7fa;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #606266;
  word-break: break-all;
  border: 1px solid #e4e7ed;
}

.url-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

/* 抽屉样式 */
.news-drawer {
  .el-drawer__header {
    margin-bottom: 0;
    padding-bottom: 1rem;
    border-bottom: 1px solid #f0f0f0;
  }
}

.drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.display-mode-toggle {
  padding: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  display: flex;
  justify-content: center;
}

.iframe-container {
  flex: 1;
  position: relative;
  background: #f5f7fa;
}

.news-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.iframe-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  padding: 2rem;
}

.loading-text {
  margin-top: 1rem;
  color: #606266;
  font-size: 0.9rem;
}

.iframe-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #f56c6c;
  padding: 2rem;
}

.iframe-error .el-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #f56c6c;
}

.iframe-error p {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .content-header {
    padding: 0.75rem 0.5rem;
  }
  
  .source-info h2 {
    font-size: 1.1rem;
  }
  
  .description {
    font-size: 0.85rem;
  }
  
  .meta {
    gap: 0.75rem;
    font-size: 0.75rem;
  }
  
  .content-body {
    padding: 0.25rem;
  }
  
  .news-item {
    padding: 0.625rem;
  }
  
  .item-title {
    font-size: 0.9rem;
  }
  
  .item-desc {
    font-size: 0.75rem;
  }
  
  .item-cover {
    width: 70px;
    height: 50px;
  }
  
  .item-meta {
    gap: 0.5rem;
    font-size: 0.7rem;
  }
  
  /* 抽屉移动端适配 */
  .news-drawer {
    .el-drawer__body {
      padding: 0;
    }
  }
  
  .display-mode-toggle {
    padding: 0.5rem;
  }
  
  .iframe-loading {
    padding: 1rem;
  }
  
  .loading-text {
    font-size: 0.8rem;
  }
  
  .iframe-error {
    padding: 1rem;
  }
  
  .iframe-error .el-icon {
    font-size: 2rem;
  }
  
  .iframe-error p {
    font-size: 0.8rem;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .item-content {
    flex-direction: column;
  }
  
  .item-cover {
    width: 100%;
    height: 120px;
  }
  
  .item-title {
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}
</style>
