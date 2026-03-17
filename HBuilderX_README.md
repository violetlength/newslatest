# HBuilderX 打包说明

## 项目配置

本项目已配置好HBuilderX所需的manifest.json文件，可以直接使用HBuilderX进行打包。

## 打包步骤

### 1. 打开项目
- 使用HBuilderX打开androidList文件夹
- HBuilderX会自动识别为uni-app项目

### 2. 配置应用信息
在manifest.json中修改以下信息：
- appid: 替换为你的应用ID
- 应用图标: 替换默认图标
- 启动页: 设置启动页图片

### 3. 云打包
1. 点击菜单 "发行" -> "原生App-云打包"
2. 选择打包平台：Android
3. 配置打包参数：
   - 使用自有证书：选择或创建证书
   - 包名：com.example.androidlist
4. 点击"打包"

### 4. 本地打包
如果需要本地打包，需要配置Android SDK：
1. 下载并安装Android Studio
2. 配置Android SDK路径
3. 点击 "发行" -> "原生App-本地打包"

## 注意事项

1. **网络权限**：已在manifest.json中配置网络权限
2. **图标规格**：应用图标建议使用512x512像素的PNG图片
3. **启动页**：启动页图片建议使用1080x1920像素
4. **证书**：正式发布需要使用正式的数字证书

## 项目结构说明

```
androidList/
├── manifest.json        # HBuilderX项目配置
├── index.html          # 入口HTML
├── src/                # 源代码
│   ├── components/     # Vue组件
│   ├── services/       # 网络服务
│   ├── stores/         # 状态管理
│   └── types/          # 类型定义
├── public/             # 静态资源
└── dist/               # 构建输出（打包后生成）
```

## 调试说明

1. **真机调试**：
   - 连接Android设备
   - 点击 "运行" -> "运行到手机或模拟器"
   - 选择设备进行调试

2. **模拟器调试**：
   - 启动Android模拟器
   - 选择模拟器进行调试

## 常见问题

1. **打包失败**：检查网络连接和证书配置
2. **图标显示异常**：确认图标格式和尺寸
3. **网络请求失败**：检查网络权限配置
