<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage, ElTag } from "element-plus";
import { WebService } from "../services/web";

interface ApiHealth {
  healthy: boolean;
  lastCheck: number;
  error?: string;
}

const apiStatus = ref<Record<string, ApiHealth>>({});
const showDetails = ref(false);
const autoRefresh = ref(true);
let refreshInterval: number | null = null;

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN");
}

function getStatusColor(healthy: boolean): "success" | "danger" {
  return healthy ? "success" : "danger";
}

function getStatusText(healthy: boolean): string {
  return healthy ? "正常" : "异常";
}

async function checkApiHealth() {
  try {
    const status = WebService.getApiHealthStatus();
    apiStatus.value = status;
    
    // 检查是否有异常的API
    const unhealthyApis = Object.entries(status).filter(([_, health]) => !health.healthy);
    if (unhealthyApis.length > 0) {
      console.warn(`发现 ${unhealthyApis.length} 个异常API:`, unhealthyApis.map(([name]) => name));
    }
  } catch (error) {
    console.error("获取API状态失败:", error);
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
    ElMessage.success("已开启自动刷新");
  } else {
    stopAutoRefresh();
    ElMessage.info("已关闭自动刷新");
  }
}

function startAutoRefresh() {
  if (refreshInterval) return;
  refreshInterval = window.setInterval(checkApiHealth, 30000); // 每30秒刷新一次
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

onMounted(() => {
  checkApiHealth();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div class="api-status">
    <div class="status-header" @click="showDetails = !showDetails">
      <div class="status-summary">
        <h4>API状态监控</h4>
        <div class="status-indicators">
          <el-tag 
            v-for="(status, name) in apiStatus" 
            :key="name"
            :type="getStatusColor(status.healthy)"
            size="small"
            class="status-tag"
          >
            {{ name }}
          </el-tag>
        </div>
      </div>
      <div class="status-controls">
        <el-switch 
          v-model="autoRefresh" 
          @change="toggleAutoRefresh"
          size="small"
          active-text="自动"
          inactive-text="手动"
        />
        <el-button 
          size="small" 
          @click.stop="checkApiHealth"
          :loading="false"
        >
          刷新
        </el-button>
      </div>
    </div>

    <div v-if="showDetails" class="status-details">
      <div 
        v-for="(status, name) in apiStatus" 
        :key="name"
        class="api-item"
      >
        <div class="api-info">
          <div class="api-name">
            <el-tag :type="getStatusColor(status.healthy)" size="small">
              {{ getStatusText(status.healthy) }}
            </el-tag>
            <span class="name">{{ name }}</span>
          </div>
          <div class="api-time">
            最后检查: {{ formatTime(status.lastCheck) }}
          </div>
        </div>
        <div v-if="status.error" class="api-error">
          <el-text type="danger" size="small">
            {{ status.error }}
          </el-text>
        </div>
      </div>
      
      <div v-if="Object.keys(apiStatus).length === 0" class="no-data">
        <el-empty description="暂无API状态数据" :image-size="60" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.api-status {
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  margin: 0.5rem;
  overflow: hidden;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  user-select: none;
}

.status-header:hover {
  background-color: #f5f7fa;
}

.status-summary h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #303133;
}

.status-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.status-tag {
  font-size: 0.7rem;
}

.status-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-details {
  border-top: 1px solid #f0f0f0;
  max-height: 300px;
  overflow-y: auto;
}

.api-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f8f9fa;
}

.api-item:last-child {
  border-bottom: none;
}

.api-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.api-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.api-name .name {
  font-weight: 500;
  color: #303133;
  font-size: 0.85rem;
}

.api-time {
  font-size: 0.75rem;
  color: #909399;
}

.api-error {
  padding-left: 0.5rem;
  border-left: 2px solid #f56c6c;
  margin-top: 0.25rem;
}

.no-data {
  padding: 1rem;
  text-align: center;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .status-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  
  .status-controls {
    justify-content: space-between;
  }
  
  .api-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .status-indicators {
    justify-content: center;
  }
}
</style>
