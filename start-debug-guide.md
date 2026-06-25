# ToonCam 启动与调试指南

> 适用于当前 ToonCam 仓库。本文重点说明如何启动项目、如何在 iPhone 14 真机上调试、以及遇到问题时该看哪里。

---

## 1. 当前项目状态

当前项目已经有基础骨架，技术栈是：

- Expo + React Native + TypeScript
- Expo Router
- `expo-camera`
- `react-native-vision-camera`
- `react-native-reanimated`
- Zustand

### 重要说明

`react-native-vision-camera` 这类原生能力通常**不能直接在 Expo Go 里完整运行**。如果你只是调试基础页面、路由、状态和普通 UI，可以先用 Expo Go；如果要调摄像头帧处理、原生模块和后续滤镜管线，通常需要 **development build** 或原生构建。

---

## 2. 先决条件

### 2.1 本机环境

你至少需要：

- Node.js
- npm
- Xcode（iOS 真机调试需要）
- iPhone 14 已解锁并连接开发环境
- 同一局域网，或者使用 Expo 隧道模式

### 2.2 iPhone 14 说明

你的手机是 iPhone 14 256G，这个配置足够跑 ToonCam 的 MVP 调试。

建议优先注意：

- 真机系统保持较新版本
- 摄像头权限在首次启动时允许
- 如果网络不稳定，优先考虑 `--tunnel`
- 如果后续使用 Vision Camera，请准备开发构建，不要只依赖 Expo Go

---

## 3. 如何启动项目

### 3.1 安装依赖

如果仓库刚拉下来，先执行：

```bash
npm install
```

### 3.2 启动开发服务

最常用的启动方式是：

```bash
npm run start
```

这会启动 Expo Dev Server。启动后你会看到一个二维码或本地地址。

### 3.3 在 iPhone 14 上打开

有两种常见方式：

#### 方式 A：Expo Go

适合先验证：

- 首页是否正常打开
- 路由是否可用
- 普通 UI 是否正常
- 不依赖原生深度能力的页面是否可跑

步骤：

1. 在 iPhone 14 上安装 Expo Go
2. 确保手机和电脑在同一网络
3. 扫描终端里的二维码
4. 打开项目

#### 方式 B：Development Build

适合验证：

- `react-native-vision-camera`
- 更完整的摄像头流程
- 后续滤镜处理
- 原生模块相关能力

这个模式更接近最终 App。

---

## 4. 推荐启动命令

### 4.1 基础调试

```bash
npm run start
```

### 4.2 直接打开 iOS 模拟器或真机构建

```bash
npm run ios
```

### 4.3 运行类型检查

```bash
npm run typecheck
```

### 4.4 运行代码检查

```bash
npm run lint
```

---

## 5. 如何调试这个项目

## 5.1 第一层：先调页面和路由

先确认这些东西正常：

- `app/_layout.tsx` 是否能加载
- `app/index.tsx` 是否能显示首页
- `app/camera.tsx` 是否能跳转
- `src/store/useAppStore.ts` 是否能正确保存状态

如果这一层有问题，通常和：

- 路由配置
- TypeScript 配置
- 导入路径别名
- Expo Router 安装状态

有关。

## 5.2 第二层：再调摄像头权限

如果相机页打不开或权限有问题，先看：

- 是否已经安装并启用摄像头权限
- iPhone 设置里是否禁用了摄像头
- `expo-camera` 的 hook 是否正确请求权限
- 真机是否真的拿到权限状态

常见现象：

- 页面能开，但摄像头黑屏
- 权限提示没出现
- 真机与模拟器表现不同

## 5.3 第三层：再调原生能力

如果你开始接 `react-native-vision-camera`：

- 先确认你不是在 Expo Go 里测试它
- 再确认 development build 已正确生成
- 最后确认原生权限和插件配置已写入

这类问题通常不是 JS 逻辑错误，而是：

- 原生编译没过
- 插件没配置
- 宿主 App 不支持对应模块

## 5.4 第四层：再调帧处理和滤镜

这一层建议按顺序做：

1. 先确认能拿到帧
2. 再确认帧数据结构正确
3. 再加简单处理
4. 最后再加 Sobel、颜色量化和多风格预设

不要一开始就把多个滤镜算法叠在一起调。

---

## 6. 调试时看什么

### 6.1 看终端输出

Expo / Metro 的终端会告诉你：

- 路由加载是否成功
- TypeScript 或 Babel 是否报错
- 模块是否无法找到
- 原生插件是否没装好

### 6.2 看手机上的表现

iPhone 14 真机上重点看：

- 首页是否正常渲染
- 页面切换是否流畅
- 摄像头权限是否弹出
- 黑屏、闪退、卡顿是否出现

### 6.3 看开发者菜单

真机打开开发者菜单后，常见调试项包括：

- Reload
- Open React DevTools
- Toggle Performance Monitor
- 查看网络和日志

---

## 7. iPhone 14 真机调试建议

### 7.1 推荐顺序

1. 先跑首页和路由
2. 再跑真机权限
3. 再跑摄像头预览
4. 最后跑滤镜和帧处理

### 7.2 推荐网络方式

如果二维码连不上，优先切换到隧道模式：

```bash
npx expo start --tunnel
```

如果同一局域网很稳定，也可以继续用默认模式。

### 7.3 相机权限

如果 iPhone 14 没弹摄像头权限：

- 去 iOS 设置里检查 ToonCam 的权限
- 卸载重装 App 再试
- 检查 `app.json` 或后续原生配置是否写入了相机权限说明

### 7.4 电脑走 LAN，手机走 5G 的情况

如果你的 Mac mini 连接的是路由器的 LAN 口，而 iPhone 14 走的是电信 5G 流量，这时 **不要依赖默认的 LAN 连接方式**。

原因很简单：

- Expo 的 LAN 模式要求手机和电脑在同一个局域网里，手机才能直接访问开发服务器
- 手机走蜂窝流量时，通常无法直接访问你电脑的本地 IP
- 这种情况下，即使 Expo Go 是最新版，也会出现连不上、扫了码没反应、或者提示不可兼容的假象

你应该这样处理：

1. 优先使用隧道模式启动

```bash
npx expo start --tunnel
```

2. 用 iPhone 14 重新扫码，走 Expo 的中转通道
3. 如果你想继续用 LAN 模式，就把 iPhone 14 切到和 Mac mini 相同的 Wi-Fi
4. 如果公司网络或路由器限制较多，直接用 tunnel，最省事

判断标准：

- **Mac mini 在有线 LAN，iPhone 用 5G** -> 用 `--tunnel`
- **Mac mini 和 iPhone 都连同一个 Wi-Fi** -> 可以尝试默认 LAN

一句话结论：**你现在这个网络拓扑，优先用 `npx expo start --tunnel`，不要用默认 LAN。**

---

## 8. 这类问题通常怎么排查

### 8.1 页面白屏

优先看：

- 路由文件是否存在
- `app/_layout.tsx` 是否正确导出 Stack
- 是否有语法错误
- 是否有错误导入

### 8.2 依赖装了但不能用

优先看：

- 是否重启了 Metro
- 是否清过缓存
- 是否真机 / Expo Go 模式不匹配
- 是否需要 development build

### 8.3 摄像头黑屏

优先看：

- 权限是否允许
- 摄像头组件是否真正渲染
- 当前运行环境是否支持该模块
- 是否在模拟器上误测了真机能力

### 8.4 原生模块报错

优先看：

- 是否用 Expo Go 跑了原生依赖
- 是否需要重新构建 App
- `babel.config.js` 或原生插件是否配置正确

---

## 9. 建议的开发节奏

### 第一步

先把首页和相机页跑通，只验证路由和 UI。

### 第二步

接入 iPhone 14 真机，验证权限和页面稳定性。

### 第三步

把摄像头预览跑起来，再接滤镜占位层。

### 第四步

最后再往里补 Sobel、颜色量化、实时预览和保存功能。

---

## 10. 当前最推荐的命令清单

```bash
npm install
npm run start
npm run typecheck
npm run lint
npx expo start --tunnel
```

---

## 11. 实际开发中的判断标准

如果一个问题出现了，先判断它属于哪一层：

- **路由层**：页面是否打开
- **权限层**：摄像头和系统权限是否正常
- **宿主层**：Expo Go 还是 Development Build
- **原生层**：Vision Camera 或其他原生模块是否支持
- **算法层**：帧处理和滤镜逻辑是否正确

按这个顺序排查，效率最高。

---

## 12. 结论

对于你当前这台 iPhone 14，最稳的路径是：

1. 先用 `npm run start` 跑基础页面
2. 用真机验证路由和 UI
3. 摄像头功能先用 `expo-camera` 验证
4. 等到需要 Vision Camera 时，再切 development build

这样可以避免一开始就掉进原生构建和模块兼容性问题里。
