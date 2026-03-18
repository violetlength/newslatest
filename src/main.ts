import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

import App from "./App.vue";

// 开发环境导入URL转换测试
if (import.meta.env.DEV) {
  import("./utils/url-transform-test");
}

const app = createApp(App);
const pinia = createPinia();

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}
 
app.use(pinia);
app.use(ElementPlus);
app.mount("#app");
