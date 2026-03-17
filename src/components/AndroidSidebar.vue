<script setup lang="ts">
import { toRefs } from 'vue';
import type { NewsSourceConfig } from "../types";

interface Props {
  activeSource: string;
  sources: NewsSourceConfig[];
}

interface Emits {
  (e: "source-change", sourceName: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 使用props中的数据
const { sources, activeSource } = toRefs(props);

function handleSourceClick(sourceName: string) {
  emit("source-change", sourceName);
}

function getSourceIcon(iconName: string) {
  // Map icon names to Element Plus icon components
  const iconMap: Record<string, string> = {
    "VideoPlay": "video-play",
    "ChatDotRound": "chat-dot-round",
    "QuestionFilled": "question-filled",
    "Link": "link",
    "Star": "star",
    "VideoCamera": "video-camera",
    "TrendCharts": "trend-charts",
    "Monitor": "monitor",
    "Code": "cpu", // Element Plus没有code图标，使用cpu代替
    "CodeSandbox": "grid", // Element Plus没有code-sandbox图标，使用grid代替
    "DocumentText": "document", // Element Plus没有document-text图标，使用document代替
    "Document": "document",
  };
  return iconMap[iconName] || "document";
}
</script>

<template>
  <aside class="android-sidebar">
    <div class="sidebar-header">
      <h3>选择新闻源</h3>
    </div>
    <div class="source-list">
      <div
        v-for="source in sources"
        :key="source.name"
        :class="['source-item', { active: activeSource === source.name }]"
        @click="handleSourceClick(source.name)"
      >
        <div class="source-icon" :style="{ color: source.color }">
          <el-icon>
            <component :is="getSourceIcon(source.icon)" />
          </el-icon>
        </div>
        <div class="source-info">
          <div class="source-title">{{ source.title }}</div>
          <div class="source-desc">{{ source.description }}</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.android-sidebar {
  width: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
}

.source-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.source-item {
  display: flex;
  align-items: center;
  padding: 0.875rem;
  margin: 0.25rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.source-item:hover {
  background: #f5f7fa;
  transform: translateX(2px);
}

.source-item.active {
  background: #f0f9ff;
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.source-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  margin-right: 0.875rem;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.source-info {
  flex: 1;
  min-width: 0;
}

.source-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}

.source-desc {
  font-size: 0.75rem;
  color: #909399;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 移动端触摸优化 */
.source-item {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* 抽屉模式下的样式调整 */
@media (max-width: 768px) {
  .source-item {
    padding: 0.75rem;
  }
  
  .source-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
    margin-right: 0.75rem;
  }
  
  .source-title {
    font-size: 0.9rem;
  }
  
  .source-desc {
    font-size: 0.7rem;
  }
}
</style>
