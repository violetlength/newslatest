<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElButton, ElTag, ElTable, ElTableColumn, ElSelect, ElOption, ElCard, ElDivider } from "element-plus";
import { ApiLogger, LogLevel } from "../utils/logger";
import { WebService } from "../services/web";

// 检查是否为开发环境
const isDevelopment = import.meta.env.DEV;

const showDevTools = ref(false);
const selectedLogLevel = ref<number | undefined>(undefined);
const selectedSource = ref<string>('');
const autoRefresh = ref(false);

let refreshInterval: number | null = null;

const logs = computed(() => {
  let filteredLogs = ApiLogger.getLogs(selectedLogLevel.value);
  
  if (selectedSource.value) {
    filteredLogs = filteredLogs.filter(log => log.source === selectedSource.value);
  }
  
  return filteredLogs.slice(-50).reverse(); // 显示最近50条，倒序
});

const stats = computed(() => ApiLogger.getStats());

const apiHealthStatus = computed(() => WebService.getApiHealthStatus());

const availableSources = computed(() => {
  const sources = new Set<string>();
  logs.value.forEach(log => sources.add(log.source));
  return Array.from(sources).sort();
});

const logLevelOptions: Array<{ label: string; value: number | undefined }> = [
  { label: '全部', value: undefined },
  { label: '调试', value: LogLevel.DEBUG },
  { label: '信息', value: LogLevel.INFO },
  { label: '警告', value: LogLevel.WARN },
  { label: '错误', value: LogLevel.ERROR },
];

function getLogLevelName(level: LogLevel): string {
  return LogLevel[level];
}

function getLogLevelType(level: LogLevel): "info" | "success" | "warning" | "danger" {
  switch (level) {
    case LogLevel.DEBUG: return 'info';
    case LogLevel.INFO: return 'success';
    case LogLevel.WARN: return 'warning';
    case LogLevel.ERROR: return 'danger';
    default: return 'info';
  }
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function formatDuration(duration?: number): string {
  if (duration === undefined) return '-';
  return `${duration}ms`;
}

function clearLogs() {
  ApiLogger.clearLogs();
}

function exportLogs() {
  const logData = logs.value.map(log => ({
    timestamp: formatTimestamp(log.timestamp),
    level: getLogLevelName(log.level),
    source: log.source,
    message: log.message,
    data: log.data ? JSON.stringify(log.data) : '',
    duration: formatDuration(log.duration)
  }));
  
  const csv = [
    'timestamp,level,source,message,data,duration',
    ...logData.map(log => 
      `"${log.timestamp}","${log.level}","${log.source}","${log.message}","${log.data}","${log.duration}"`
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `api-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function startAutoRefresh() {
  if (refreshInterval) return;
  refreshInterval = window.setInterval(() => {
    // 强制更新计算属性
    selectedLogLevel.value = selectedLogLevel.value;
  }, 1000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function toggleDevTools() {
  showDevTools.value = !showDevTools.value;
}

// 全局快捷键 Ctrl+Shift+D 切换开发者工具
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggleDevTools();
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    stopAutoRefresh();
  });
});

if (autoRefresh.value) {
  startAutoRefresh();
}
</script>

<template>
  <!-- 开发者工具切换按钮 -->
  <div v-if="isDevelopment" class="dev-tools-toggle">
    <el-button 
      size="small" 
      type="primary" 
      @click="toggleDevTools"
      circle
      title="开发者工具 (Ctrl+Shift+D)"
    >
      🛠️
    </el-button>
  </div>

  <!-- 开发者工具面板 -->
  <div v-if="showDevTools && isDevelopment" class="dev-tools-panel">
    <el-card class="dev-tools-card">
      <template #header>
        <div class="card-header">
          <h3>开发者工具</h3>
          <div class="card-controls">
            <el-switch 
              v-model="autoRefresh" 
              @change="toggleAutoRefresh"
              size="small"
              active-text="自动刷新"
            />
            <el-button size="small" @click="clearLogs">清空日志</el-button>
            <el-button size="small" @click="exportLogs">导出日志</el-button>
            <el-button size="small" @click="toggleDevTools">关闭</el-button>
          </div>
        </div>
      </template>

      <!-- 统计信息 -->
      <div class="stats-section">
        <h4>统计信息</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">总日志数:</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平均耗时:</span>
            <span class="stat-value">{{ stats.avgDuration ? `${stats.avgDuration.toFixed(2)}ms` : '-' }}</span>
          </div>
        </div>
        
        <div class="log-level-stats">
          <div v-for="(count, level) in stats.byLevel" :key="level" class="level-stat">
            <el-tag :type="getLogLevelType(Number(level))" size="small">
              {{ getLogLevelName(Number(level)) }}: {{ count }}
            </el-tag>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- API健康状态 -->
      <div class="health-section">
        <h4>API健康状态</h4>
        <div class="health-grid">
          <div v-for="(status, name) in apiHealthStatus" :key="name" class="health-item">
            <el-tag :type="status.healthy ? 'success' : 'danger'" size="small">
              {{ name }}
            </el-tag>
            <span class="health-time">
              {{ formatTimestamp(status.lastCheck) }}
            </span>
            <span v-if="status.error" class="health-error" :title="status.error">
              ❌
            </span>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 过滤器 -->
      <div class="filters-section">
        <div class="filter-row">
          <span>日志级别: {{ selectedLogLevel !== undefined ? getLogLevelName(selectedLogLevel) : '全部' }}</span>
          <el-button size="small" @click="selectedLogLevel = undefined">清除过滤</el-button>
        </div>
        <div class="filter-row">
          <span>数据源: {{ selectedSource || '全部' }}</span>
          <el-button size="small" @click="selectedSource = ''">清除过滤</el-button>
        </div>
      </div>

      <!-- 日志表格 -->
      <div class="logs-section">
        <h4>API日志 (最近50条)</h4>
        <el-table :data="logs" size="small" max-height="400">
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.timestamp) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="level" label="级别" width="80">
            <template #default="{ row }">
              <el-tag :type="getLogLevelType(row.level)" size="small">
                {{ getLogLevelName(row.level) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="source" label="来源" width="100" />
          
          <el-table-column prop="message" label="消息" />
          
          <el-table-column prop="duration" label="耗时" width="80">
            <template #default="{ row }">
              {{ formatDuration(row.duration) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.dev-tools-toggle {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
}

.dev-tools-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 90%;
  max-width: 800px;
  height: 90vh;
  z-index: 9998;
  overflow: hidden;
}

.dev-tools-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dev-tools-card :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
}

.card-controls {
  display: flex;
  gap: 0.5rem;
}

.stats-section, .health-section, .filters-section, .logs-section {
  margin-bottom: 1rem;
}

.stats-section h4, .health-section h4, .filters-section h4, .logs-section h4 {
  margin: 0 0 0.5rem 0;
  color: #303133;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0.5rem;
  background: #f5f7fa;
  border-radius: 4px;
}

.stat-label {
  font-weight: 500;
  color: #606266;
}

.stat-value {
  font-weight: 600;
  color: #303133;
}

.log-level-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.level-stat {
  display: inline-block;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.health-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #f5f7fa;
  border-radius: 4px;
}

.health-time {
  font-size: 0.75rem;
  color: #909399;
}

.health-error {
  color: #f56c6c;
  cursor: help;
}

.filter-row {
  display: flex;
  gap: 0.5rem;
}

.filter-row .el-select {
  width: 120px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .dev-tools-panel {
    width: 95%;
    height: 95vh;
  }
  
  .card-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  
  .card-controls {
    justify-content: space-between;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .health-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-row {
    flex-direction: column;
  }
  
  .filter-row .el-select {
    width: 100%;
  }
}
</style>
