<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useNewsStore } from "../stores/news";
import AndroidSidebar from "./AndroidSidebar.vue";
import AndroidContent from "./AndroidContent.vue";
import AndroidHeader from "./AndroidHeader.vue";
import ApiStatus from './ApiStatus.vue'
import DevTools from './DevTools.vue'
import ApiDebug from './ApiDebug.vue'

const newsStore = useNewsStore();
const activeSource = ref<string>("bilibili");
const showSidebar = ref<boolean>(false);

onMounted(async () => {
  await newsStore.fetchAllSources();
});

async function handleRefresh() {
  if (activeSource.value) {
    try {
      await newsStore.refreshNewsSource(activeSource.value);
      ElMessage.success("刷新成功");
    } catch (error) {
      ElMessage.error("刷新失败");
    }
  }
}

async function handleClearCache() {
  try {
    await ElMessageBox.confirm("确定要清空所有缓存吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    
    const clearedCount = await newsStore.clearAllCache();
    await newsStore.fetchAllSources();
    ElMessage.success(`已清空 ${clearedCount} 个缓存项`);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("清空缓存失败");
    }
  }
}

function handleSourceChange(sourceName: string) {
  activeSource.value = sourceName;
  showSidebar.value = false; // 选择后关闭侧边栏
}

function toggleSidebar() {
  showSidebar.value = !showSidebar.value;
}
</script>

<template>
  <div class="android-layout">
    <AndroidHeader 
      :active-source="activeSource"
      @refresh="handleRefresh"
      @clear-cache="handleClearCache"
      @toggle-sidebar="toggleSidebar"
    />
    <div class="main-content">
      <AndroidContent 
        :active-source="activeSource"
        :news-source="newsStore.getNewsSource(activeSource)"
        :loading="newsStore.isLoading(activeSource)"
        :error="newsStore.getError(activeSource)"
      />
    </div>
    
    <!-- 移动端侧边栏 -->
    <el-drawer
      v-model="showSidebar"
      direction="ltr"
      size="280px"
      :show-close="true"
      title="选择新闻源"
    >
      <AndroidSidebar 
        :active-source="activeSource"
        :sources="newsStore.newsSourceConfigs"
        @source-change="handleSourceChange"
      />
    </el-drawer>
  </div>
</template>

<style scoped>
.android-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .android-layout {
    height: 100vh;
    height: 100dvh; /* 动态视口高度 */
  }
}
</style>
