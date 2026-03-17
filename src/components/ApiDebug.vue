<template>
  <div class="api-debug">
    <el-card class="debug-card">
      <template #header>
        <div class="card-header">
          <span>API调试工具</span>
          <el-button type="primary" @click="testAllApis" :loading="testing">
            测试所有API
          </el-button>
        </div>
      </template>

      <div class="api-list">
        <div v-for="api in apis" :key="api.name" class="api-item">
          <div class="api-info">
            <span class="api-name">{{ api.title }}</span>
            <span class="api-status" :class="getStatusClass(api.status)">
              {{ getStatusText(api.status) }}
            </span>
          </div>
          
          <div class="api-actions">
            <el-button size="small" @click="testApi(api)" :loading="api.loading">
              测试
            </el-button>
            <el-button size="small" @click="showDetails(api)">
              详情
            </el-button>
          </div>
        </div>
      </div>

      <el-dialog v-model="detailVisible" title="API详情" width="80%">
        <div v-if="selectedApi">
          <h3>{{ selectedApi.title }}</h3>
          <div class="api-details">
            <div class="detail-item">
              <label>状态:</label>
              <span :class="getStatusClass(selectedApi.status)">
                {{ getStatusText(selectedApi.status) }}
              </span>
            </div>
            <div class="detail-item">
              <label>响应时间:</label>
              <span>{{ selectedApi.responseTime }}ms</span>
            </div>
            <div class="detail-item">
              <label>数据条数:</label>
              <span>{{ selectedApi.dataCount }}</span>
            </div>
            <div class="detail-item" v-if="selectedApi.error">
              <label>错误信息:</label>
              <span class="error-text">{{ selectedApi.error }}</span>
            </div>
            <div class="detail-item" v-if="selectedApi.sampleData">
              <label>示例数据:</label>
              <pre class="sample-data">{{ JSON.stringify(selectedApi.sampleData, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { WebService } from '../services/web'
import type { NewsSource } from '../types'

interface ApiInfo {
  name: string
  title: string
  status: 'idle' | 'loading' | 'success' | 'error'
  loading: boolean
  responseTime: number
  dataCount: number
  error?: string
  sampleData?: any
}

const apis = reactive<ApiInfo[]>([
  { name: 'bilibili', title: '哔哩哔哩', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'weibo', title: '微博', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'zhihu', title: '知乎', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'github', title: 'GitHub', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'juejin', title: '掘金', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'douyin', title: '抖音', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: '36kr', title: '36氪', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'ithome', title: 'IT之家', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'segmentfault', title: '思否', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'oschina', title: '开源中国', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'infoq', title: 'InfoQ', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'ruanyifeng', title: '阮一峰周刊', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'csdn', title: 'CSDN', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'stcn', title: '证券时报', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
  { name: 'caixin', title: '财新网', status: 'idle', loading: false, responseTime: 0, dataCount: 0 },
])

const testing = ref(false)
const detailVisible = ref(false)
const selectedApi = ref<ApiInfo | null>(null)

const getStatusClass = (status: string) => {
  return {
    'status-idle': status === 'idle',
    'status-loading': status === 'loading',
    'status-success': status === 'success',
    'status-error': status === 'error',
  }
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'idle': '未测试',
    'loading': '测试中',
    'success': '成功',
    'error': '失败'
  }
  return statusMap[status] || '未知'
}

const testApi = async (api: ApiInfo) => {
  api.status = 'loading'
  api.loading = true
  api.error = undefined
  api.sampleData = undefined

  const startTime = Date.now()

  try {
    const methodName = `get${api.name.charAt(0).toUpperCase() + api.name.slice(1)}Hot`
    // 使用类型断言来调用方法
    const webService = WebService as any
    if (typeof webService[methodName] === 'function') {
      const result = await webService[methodName](true) as NewsSource
      api.responseTime = Date.now() - startTime
      api.dataCount = result.items.length
      api.sampleData = result.items.slice(0, 2) // 只显示前2条作为示例
      api.status = 'success'
      ElMessage.success(`${api.title} API测试成功`)
    } else {
      throw new Error(`方法 ${methodName} 不存在`)
    }
  } catch (error) {
    api.responseTime = Date.now() - startTime
    api.error = error instanceof Error ? error.message : String(error)
    api.status = 'error'
    ElMessage.error(`${api.title} API测试失败: ${api.error}`)
  } finally {
    api.loading = false
  }
}

const testAllApis = async () => {
  testing.value = true
  
  for (const api of apis) {
    await testApi(api)
    await new Promise(resolve => setTimeout(resolve, 500)) // 避免请求过于频繁
  }
  
  testing.value = false
  ElMessage.success('所有API测试完成')
}

const showDetails = (api: ApiInfo) => {
  selectedApi.value = api
  detailVisible.value = true
}
</script>

<style scoped>
.api-debug {
  padding: 20px;
}

.debug-card {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.api-list {
  margin-top: 20px;
}

.api-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.api-item:last-child {
  border-bottom: none;
}

.api-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.api-name {
  font-weight: 500;
}

.api-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.status-idle {
  background-color: #f0f0f0;
  color: #666;
}

.status-loading {
  background-color: #e6f7ff;
  color: #1890ff;
}

.status-success {
  background-color: #f6ffed;
  color: #52c41a;
}

.status-error {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.api-actions {
  display: flex;
  gap: 8px;
}

.api-details {
  margin-top: 20px;
}

.detail-item {
  margin-bottom: 12px;
}

.detail-item label {
  font-weight: 500;
  margin-right: 8px;
  min-width: 80px;
  display: inline-block;
}

.error-text {
  color: #ff4d4f;
}

.sample-data {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 12px;
}
</style>
