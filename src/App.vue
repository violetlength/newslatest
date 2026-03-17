<script setup lang="ts">
import { onMounted } from "vue";
import { ElMessage } from "element-plus";
import AndroidLayout from "./components/AndroidLayout.vue";

onMounted(() => {
  ElMessage.success("欢迎使用 AndroidList - 移动应用");
});
</script>

<template>
  <div class="app-container">
    <AndroidLayout />
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>

<style>
:root {
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 400;
  color: #333;
  background-color: #f5f5f5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 移动端适配 */
@media (max-width: 768px) {
  :root {
    font-size: 16px;
  }
}

/* Element Plus 移动端适配 */
.el-message {
  min-width: 300px !important;
  max-width: 90% !important;
}

.el-dialog {
  width: 90% !important;
  margin: 5vh auto !important;
}

.el-drawer {
  width: 85% !important;
}
</style>
