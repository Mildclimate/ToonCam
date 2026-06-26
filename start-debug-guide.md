# ToonCam 启动与调试指南

> 适用于当前 ToonCam 仓库。本文重点说明如何启动项目、如何在 iPhone 真机上调试、以及遇到问题时该看哪里。

---

## 1. 当前项目状态

技术栈：

- Expo SDK 54 + React Native 0.81 + TypeScript 5.9
- Expo Router（`app/` 目录路由）
- `react-native-vision-camera` 5.x（摄像头 + 帧处理）
- `react-native-vision-camera-worklets` + `react-native-worklets`（帧处理管线）
- Zustand（全局状态）
- 相机页：上下分屏，上半真机预览，下半实时卡通滤镜

### 重要说明

本项目已完全迁移到 `react-native-vision-camera`，**不再支持 Expo Go**。所有调试必须通过 **development build** 进行。

---

## 2. 先决条件

- Node.js、npm
- **Xcode**（完整版，不是只装命令行工具）
- CocoaPods（`brew install cocoapods`）
- iPhone 真机，数据线连接，已信任电脑
- iPhone 和电脑在同一 WiFi

---

## 3. 日常调试流程（每次改代码后）

### 3.1 启动 Metro

```bash
npx expo start --dev-client
```

### 3.2 手机上打开 App

打开 iPhone 上的 **ToonCam** App（之前通过 Xcode 安装的 development build）。

App 会自动连接电脑上的 Metro 服务器。如果连不上：

1. 摇一摇手机 → **Configure URL**
2. 输入 Metro 显示的地址，如 `192.168.0.107:8081`

### 3.3 热更新

修改代码后，摇一摇手机 → **Reload**，或在 Metro 终端按 `r`。

### 3.4 停止调试

Metro 终端按 `Ctrl+C`。

---

## 4. 首次构建 / 装了新原生依赖后

如果改过 `package.json`（装/删 npm 原生包），需要重建 App：

```bash
npx expo prebuild --platform ios --clean
```

然后用 Xcode 打开并运行：

```bash
open ios/ToonCam.xcworkspace
```

Xcode 里：选 Scheme `ToonCam` + 设备选你的 iPhone → **⌘R** 运行。

---

## 5. Metro 终端快捷键

|    键     | 作用             |
| :-------: | ---------------- |
|    `r`    | 手机重新加载 JS  |
|    `m`    | 手机打开开发菜单 |
| `Shift+m` | 更多工具         |
| `Ctrl+C`  | 停止 Metro       |

---

## 6. 调试时看什么

### 终端

Metro 终端会显示：路由加载状态、Babel/TS 编译错误、模块缺失、原生插件问题。

### 手机上

- 首页 / 相机页是否正常渲染
- 摄像头预览是否出现
- 下半屏卡通网格是否实时更新
- 切换滤镜模式是否有变化

### 开发者菜单（摇一摇）

- **Reload** — 重新加载 JS
- **Toggle Performance Monitor** — 查看帧率
- **Configure URL** — 改 Metro 地址

---

## 7. 常见问题

| 现象         | 先检查                                               |
| ------------ | ---------------------------------------------------- |
| 白屏         | Metro 是否在运行、路由文件是否存在                   |
| 摄像头黑屏   | 权限是否允许、是否用的 development build             |
| App 打不开   | 是否信任了开发者证书（设置 → 通用 → VPN 与设备管理） |
| 连不上 Metro | WiFi 是否同一网络、IP 是否正确                       |
| 原生包报错   | 是否重新 `prebuild` + Xcode 构建                     |

---

## 8. 网络说明

- Mac 和 iPhone 必须同一 WiFi
- 如果网络不稳定，用隧道模式：`npx expo start --dev-client --tunnel`
- Mac 走 LAN、iPhone 走 5G → 必须用 `--tunnel`

---

## 9. 当前最推荐命令

```bash
# 日常开发
npx expo start --dev-client

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 重建原生项目
npx expo prebuild --platform ios --clean
```
