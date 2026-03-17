<script setup lang="ts">
import { Refresh, Delete, Menu } from "@element-plus/icons-vue";

interface Props {
  activeSource: string;
}

interface Emits {
  (e: "refresh"): void;
  (e: "clear-cache"): void;
  (e: "toggle-sidebar"): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<template>
  <header class="android-header">
    <div class="header-content">
      <div class="left">
        <el-button 
          :icon="Menu" 
          @click="$emit('toggle-sidebar')"
          class="menu-btn"
          circle
          size="small"
        />
        <div class="logo">
          <h1>AndroidList</h1>
        </div>
      </div>
      <div class="right">
        <el-button 
          type="primary" 
          :icon="Refresh" 
          @click="$emit('refresh')"
          size="small"
          circle
          title="刷新当前数据源"
        />
        <el-button 
          type="danger" 
          :icon="Delete" 
          @click="$emit('clear-cache')"
          size="small"
          circle
          title="清空所有缓存"
        />
      </div>
    </div>
  </header>
</template>

<style scoped>
.android-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  max-width: 100%;
}

.left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.right {
  display: flex;
  gap: 0.5rem;
}

.logo h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: white;
}

.menu-btn,
.right .el-button {
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.menu-btn:hover,
.right .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.right .el-button--danger {
  background: rgba(245, 108, 108, 0.8);
}

.right .el-button--danger:hover {
  background: rgba(245, 108, 108, 0.9);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .header-content {
    padding: 0.75rem 0.5rem;
  }
  
  .logo h1 {
    font-size: 1.1rem;
  }
  
  .menu-btn,
  .right .el-button {
    width: 32px;
    height: 32px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .header-content {
    padding: 0.5rem;
  }
  
  .logo h1 {
    font-size: 1rem;
  }
}
</style>
