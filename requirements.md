# 中国地震数据可视化平台 - 需求文档

## 1. 项目概述

### 1.1 产品定位
一个专注于中国及全球地震数据实时监测与可视化分析的专业级数据平台，采用深色科技主题，提供沉浸式的数据探索体验。

### 1.2 核心特色
- **深色科技美学**：深邃宇宙黑配合熔岩橙、极光绿、深海蓝等数据高亮色
- **动态数据可视化**：粒子涟漪、脉冲波纹、轨迹动画等创新交互效果
- **实时数据流**：毫秒级数据更新，支持历史数据回溯
- **全端响应式**：PC/平板/手机三端自适应，触控优化

### 1.3 目标用户
- 地震科研人员
- 应急管理部门
- 地理信息爱好者
- 关注地震动态的普通公众

---

## 2. 功能需求

### 2.1 核心模块

#### 2.1.1 实时监测大屏
- **功能描述**：全球地震实时分布可视化
- **数据更新**：每60秒自动刷新
- **视觉元素**：
  - 地球球体/平面地图双模式切换
  - 震中点：大小按震级缩放，颜色按深度分层
  - 震波扩散动画：同心圆涟漪效果
  - 最近地震列表：倒序排列，自动滚动

#### 2.1.2 数据统计中心
- **功能描述**：多维度地震数据分析
- **统计维度**：
  - 震级分布直方图
  - 深度分层统计
  - 时间趋势曲线
  - 区域热力分布
- **交互功能**：时间范围筛选、区域筛选、震级区间筛选

#### 2.1.3 地震详情面板
- **功能描述**：单个地震事件的详细信息展示
- **展示内容**：
  - 基础信息（时间、地点、震级、深度）
  - 震中定位地图
  - 历史相似地震对比
  - 烈度预估（基于震级和深度计算）

#### 2.1.4 预警推送模拟
- **功能描述**：地震预警信息展示（模拟）
- **视觉设计**：红色警报脉冲效果
- **信息内容**：预估到达时间、预估烈度、避险建议

### 2.2 交互设计

#### 2.2.1 导航交互
- 左侧浮动导航栏
- 鼠标悬停展开图标标签
- 当前页面高亮指示器

#### 2.2.2 数据筛选器
- 时间范围滑块（24h/7d/30d/自定义）
- 震级阈值调节
- 深度分层开关
- 区域多选框

#### 2.2.3 地图操作
- 滚轮缩放
- 拖拽平移
- 双击聚焦
- 长按显示详情（移动端）

---

## 3. 技术架构

### 3.1 技术栈
- **前端框架**：原生 HTML5 + CSS3 + JavaScript ES6+
- **可视化库**：D3.js（数据可视化）+ Leaflet（地图）
- **构建工具**：Vite
- **HTTP请求**：原生 Fetch API

### 3.2 数据源
- **主数据源**：USGS Earthquake API (GeoJSON)
  - 实时数据：`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson`
  - 日数据：`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`
  - 周数据：`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson`
  - 月数据：`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson`

### 3.3 项目结构
```
earthquake-viz/
├── index.html              # 入口页面
├── src/
│   ├── main.js             # 主入口
│   ├── styles/
│   │   ├── variables.css   # CSS变量定义
│   │   ├── components.css  # 组件样式
│   │   ├── animations.css  # 动画效果
│   │   └── responsive.css  # 响应式适配
│   ├── components/
│   │   ├── MapViewer.js    # 地图可视化组件
│   │   ├── DataStats.js    # 数据统计组件
│   │   ├── QuakeList.js    # 地震列表组件
│   │   ├── DetailPanel.js  # 详情面板组件
│   │   └── Navigation.js   # 导航组件
│   ├── services/
│   │   └── earthquakeAPI.js # API服务
│   └── utils/
│       ├── formatter.js    # 数据格式化
│       └── calculator.js   # 计算工具
├── assets/
│   └── icons/              # SVG图标
└── docs/
    └── api-reference.md    # API文档
```

---

## 4. 视觉设计规范

### 4.1 色彩系统
```css
/* 背景色阶 */
--bg-deep: #0a0a0f;         /* 深渊黑 */
--bg-primary: #12121a;      /* 宇宙黑 */
--bg-secondary: #1a1a25;    /* 暗星灰 */
--bg-tertiary: #252536;     /* 星云灰 */

/* 数据高亮色 */
--accent-lava: #ff6b35;     /* 熔岩橙 - 高震级 */
--accent-aurora: #00d9a5;   /* 极光绿 - 中震级 */
--accent-ocean: #00a8e8;    /* 深海蓝 - 低震级 */
--accent-purple: #9d4edd;   /* 紫罗兰 - 极深 */

/* 功能色 */
--danger: #ff2d55;          /* 警报红 */
--warning: #ff9500;         /* 警告橙 */
--success: #34c759;         /* 安全绿 */
--info: #5ac8fa;            /* 信息蓝 */

/* 文字色 */
--text-primary: #ffffff;
--text-secondary: rgba(255,255,255,0.7);
--text-tertiary: rgba(255,255,255,0.5);
```

### 4.2 字体规范
- **主字体**：Inter, -apple-system, BlinkMacSystemFont, sans-serif
- **数据字体**：JetBrains Mono, SF Mono, monospace
- **标题层级**：
  - H1: 32px / font-weight: 700
  - H2: 24px / font-weight: 600
  - H3: 18px / font-weight: 600
  - Body: 14px / font-weight: 400

### 4.3 间距系统
- 基础单位：4px
- 层级：4, 8, 12, 16, 24, 32, 48, 64px

### 4.4 圆角系统
- 小：4px（按钮、标签）
- 中：8px（卡片、输入框）
- 大：16px（面板、弹窗）
- 完全：9999px（胶囊、圆形）

---

## 5. 动画规范

### 5.1 入场动画
- 持续时间：300-500ms
- 缓动函数：cubic-bezier(0.16, 1, 0.3, 1)
- 效果：从下方滑入 + 透明度渐变

### 5.2 交互动画
- 悬停：scale(1.02), 200ms
- 点击：scale(0.98), 100ms
- 聚焦：发光边框扩散

### 5.3 数据动画
- 震波涟漪：2秒一个周期，渐隐扩散
- 数据更新：数字滚动效果
- 列表滚动：平滑滚动 + 渐变遮罩

---

## 6. 响应式断点

| 设备 | 断点 | 布局 |
|------|------|------|
| 移动端 | < 768px | 单列，底部导航 |
| 平板 | 768px - 1024px | 双列，侧边导航折叠 |
| PC端 | > 1024px | 多列，侧边导航展开 |

---

## 7. 性能要求

- 首屏加载时间 < 2s
- 地图交互帧率 > 60fps
- 数据更新无卡顿
- 支持1000+数据点流畅渲染

---

## 8. 无障碍设计

- 支持键盘导航
- ARIA标签完整
- 高对比度模式支持
- 支持屏幕阅读器
