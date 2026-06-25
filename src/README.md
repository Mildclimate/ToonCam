# src 目录说明

> 这里是 ToonCam 的应用代码区。当前项目采用“按功能划分 + 少量共享层”的方式组织代码，目标是让 LLM 和开发者都能快速定位职责边界，避免把所有逻辑堆到一起。

---

## 1. 目录总览

```text
src/
├── components/     # 通用 UI 组件
├── constants/      # 全局常量
├── features/       # 功能模块，按业务域划分
├── hooks/          # 可复用的业务 hooks
├── providers/      # 应用级 Provider 组合
├── services/       # 访问存储、系统能力、第三方 API
├── store/          # 全局状态管理
├── styles/         # 主题、设计 token、样式变量
├── types/          # 跨模块共享类型
└── utils/          # 无状态工具函数
```

---

## 2. 各模块职责

### 2.1 `src/components/`

放通用 UI 组件，不绑定具体业务场景。

当前示例：

- `src/components/ui/Screen.tsx`：安全区容器，给页面提供统一背景和布局基础

适合放：

- 按钮、卡片、容器、标题栏、空状态等可复用组件
- 不依赖 camera / store / 特定页面状态的纯 UI 组件

注意事项：

- 不要把业务逻辑放进通用组件
- 不要把某个功能页专用组件塞进这里
- 如果组件只被一个 feature 使用，优先放到对应 feature 里

---

### 2.2 `src/constants/`

放项目级静态常量。

当前示例：

- `APP_NAME`：应用名称
- `DEFAULT_FILTER_MODE`：默认滤镜模式
- `SUPPORTED_PLATFORMS`：支持平台列表

适合放：

- 应用名、默认值、环境无关的常量
- 不会在运行时频繁变化的配置

注意事项：

- 不要把用户态数据放这里
- 不要把会经常改动的业务状态放这里
- 常量命名保持清晰、直接

---

### 2.3 `src/features/`

功能模块区，按业务域组织。

当前示例：

- `src/features/camera/`：摄像头相关的页面、组件、hooks、frame processor、类型

适合放：

- 一个完整业务功能的所有实现
- 页面级组件、feature 专属 hooks、feature 内部服务
- 和该功能强相关的类型与工具

推荐结构：

```text
src/features/camera/
├── components/   # 该功能专用 UI
├── hooks/        # 该功能专用 hooks
├── services/     # 该功能专用服务
├── types.ts      # 该功能专用类型
└── index.ts      # 对外导出
```

注意事项：

- 业务逻辑优先放在 feature 内，不要直接散落到全局层
- feature 内部允许有自己的小型结构，但不要过度分层
- `index.ts` 只做导出聚合，不要塞逻辑

当前 `camera` 功能说明：

- `components/CameraPreview.tsx`：摄像头预览占位组件
- `components/FilterPreview.tsx`：滤镜预览占位组件
- `hooks/useCameraPermissions.ts`：相机权限请求封装
- `services/frameProcessor.ts`：帧处理管道的占位入口
- `types.ts`：摄像头与滤镜模式类型

---

### 2.4 `src/hooks/`

放可复用的业务 hooks。

当前示例：

- `useAppReady()`：应用初始化状态 hook

适合放：

- 跨页面复用的状态控制 hooks
- 和具体 feature 无强耦合，但又不适合放在 `utils/` 的逻辑

注意事项：

- 如果 hook 只属于某个 feature，优先放到 feature 下
- hook 要尽量保持职责单一

---

### 2.5 `src/providers/`

放应用级 Provider 组合层。

当前示例：

- `AppProviders`：统一包裹全局 Provider 的入口

适合放：

- ThemeProvider
- StoreProvider
- QueryProvider
- SafeArea / Toast / Modal 等全局包装器

注意事项：

- 页面不应该直接依赖多个分散 Provider
- 全局 Provider 尽量集中管理，避免入口分裂

---

### 2.6 `src/services/`

放系统能力、存储、第三方服务调用等“有副作用”的能力封装。

当前示例：

- `storage.ts`：AsyncStorage 的读写封装

适合放：

- 本地存储
- 文件系统访问
- 网络请求封装
- 设备能力调用

注意事项：

- 这里的函数通常不应该直接包含 UI 逻辑
- 如果某个 service 只给 feature 用，也可以放进 feature 的 `services/`

---

### 2.7 `src/store/`

放全局状态管理。

当前示例：

- `useAppStore.ts`：全局相机朝向、滤镜模式状态

适合放：

- 多页面共享状态
- 需要跨组件同步的全局 UI 状态
- 用户偏好、模式切换、应用级设置

注意事项：

- 不要把可以局部管理的状态全扔到 store 里
- store 应保持扁平、可读、易维护
- 如果某个状态只在一个 feature 内使用，优先局部化

---

### 2.8 `src/styles/`

放主题、颜色、间距、排版等样式 token。

当前示例：

- `theme.ts`：颜色主题定义

适合放：

- 颜色系统
- 字体系统
- 间距系统
- 圆角、阴影、层级等设计 token

注意事项：

- 不要把业务样式写成散乱的魔法数字
- 保持主题集中，方便后续统一换肤

---

### 2.9 `src/types/`

放跨模块共享类型。

当前示例：

- 从 `features/camera/types` 重新导出的类型

适合放：

- 真正被多个目录共享的基础类型
- 跨 feature 使用的数据结构定义

注意事项：

- 如果类型只属于某个 feature，优先留在 feature 内
- 不要把所有类型都堆到这里，避免变成垃圾场

---

### 2.10 `src/utils/`

放无状态、无副作用的工具函数。

当前示例：

- `ensure()`：运行时断言工具

适合放：

- 格式化、校验、纯计算、类型收窄工具

注意事项：

- 工具函数最好可测试、可复用、尽量纯函数
- 不要把访问存储、网络请求、设备调用放到这里

---

## 3. 当前项目的推荐边界

### 3.1 先按 feature 放代码

对于 ToonCam，优先遵循这个原则：

- 摄像头相关代码进 `src/features/camera/`
- 只给 camera 用的组件、hook、service、type，都尽量留在 camera feature 内
- 真正通用的，才上升到 `src/components/`、`src/hooks/`、`src/services/`

### 3.2 不要过早抽象

当前项目还是骨架期，推荐的做法是：

- 先把一个功能跑通
- 再观察哪些代码真的复用
- 最后再抽公共层

### 3.3 命名建议

- 组件：PascalCase
- hook：`useXxx`
- store：`useXxxStore`
- service：直接表达职责，如 `storage.ts`
- feature 入口：`index.ts`

---

## 4. 对 LLM 的使用提醒

如果你让 LLM 在这个仓库里写代码，最好先让它遵守下面几点：

- 优先查看 `plan.md` 和 `copilot.md`
- 先定位到 feature 内部，再决定是否上升到共享层
- 不要为了“整洁”无意义拆文件
- 不要把一个 feature 的职责散到很多目录里
- 每次改动尽量只触碰最小必要文件集

---

## 5. 当前阶段的实际建议

ToonCam 现在最重要的是保持结构简单、边界清楚：

- `app/` 负责路由和页面入口
- `src/features/camera/` 负责相机功能本体
- `src/store/` 只放少量全局状态
- `src/services/` 处理存储和系统能力
- `src/styles/` 管主题 token

后续如果开始接滤镜、帧处理、保存照片，再逐步往 feature 内扩展，不要一开始就把架构做重。
