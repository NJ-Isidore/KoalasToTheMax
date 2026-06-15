# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

KoalasToTheMax 是一个基于 D3.js 的静态单页交互可视化应用。用户通过鼠标/触摸逐步揭开由圆形马赛克覆盖的图片，圆形会根据鼠标位置不断分裂细化，最终呈现出原始图像的像素化效果。

项目地址：http://koalastothemax.com

## 技术栈

- **纯静态站点**：无构建系统、无包管理器、无测试框架、无 linter
- **前端**：原生 ES5 JavaScript + D3.js（v4，已 vendor 为 `d3.min.js`）+ CSS3
- **后端**（可选）：PHP，用于跨域图片代理
- **兼容性**：通过 `polyfill/` 目录支持 IE8+

## 开发与部署

直接编辑源文件后刷新浏览器即可预览，无需任何构建步骤。部署时将全部文件复制到 Web 服务器根目录。

如需使用跨域图片代理功能：
1. 将 `example_config.php` 复制为 `config.php`
2. 配置缓存目录路径和哈希盐值
3. 确保 `image-server.php` 可被前端访问

## 核心架构

### 入口与初始化（`index.html`）

- 按顺序加载：polyfill → D3.js → `koala.js`
- 内联脚本负责 URL 参数解析（支持 base64 编码的图片 URL、URL 数组、或含 `images`/`background`/`hideNote` 的 JSON 对象）
- 调用 `koala.loadImage()` 加载图片后调用 `koala.makeCircles()` 生成可视化

### 可视化引擎（`koala.js`）

- 暴露全局命名空间 `window.koala`
- `koala.loadImage(img)` — 将图片绘制到 128×128 隐藏 canvas，提取 RGBA 像素数据
- `koala.makeCircles(selector, colorData, onEvent)` — 核心渲染逻辑：
  - 基于像素数据构建四叉树空间层级结构
  - 初始状态为一个覆盖 512×512 视口的大圆
  - 鼠标/触摸移动时，圆形根据空间交集分裂为 4 个子圆
  - 每个圆的颜色取自其覆盖像素的 RGB 平均值
  - 使用 D3.js 驱动 SVG 渲染和过渡动画

### PHP 图片代理（`image-server.php`）

- 代理跨域图片请求，绕过浏览器 CORS 限制
- 将远程图片缓存到本地磁盘（MD5 哈希文件名）
- 自动将超过 800px 的图片缩放后缓存

## 自定义图片 URL 协议

| 格式 | 说明 |
|------|------|
| `DOMAIN` | 加载默认随机动物图片 |
| `DOMAIN?<base64>` | base64 编码的图片 URL、URL 数组 JSON、或配置对象 JSON |
| `DOMAIN?<image_url>` | 向后兼容的旧格式，直接传图片 URL |

## 关键文件

| 文件 | 职责 |
|------|------|
| `index.html` | 页面壳、资源加载、DOM 结构 |
| `koala.js` | 可视化引擎核心，makeCircles 返回控制接口供外部模块使用 |
| `koala.css` | SVG 画布和页面布局样式 |
| `d3.min.js` | D3.js v4（vendor 副本，勿修改） |
| `image-server.php` | PHP 跨域图片代理 |
| `app.js` | 应用主逻辑：URL 解析、初始化、事件回调、SVG 导出 |
| `tracking.js` | 版本号和跟踪函数（当前为无操作模式） |
| `easter-egg.js` | 空格键自动展开彩蛋（独立模块） |
| `polyfill/` | ES5 + DOM polyfill，面向旧版 IE |
| `img/` | 默认动物图片资源 |

## 彩蛋

- 在页面按**空格键**触发自动随机展开圆形（逻辑在 `easter-egg.js` 中）
