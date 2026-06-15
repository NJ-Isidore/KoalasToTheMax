"use strict";

// 版本号（更新时同步修改 index.html 中 script/link 的缓存参数）
var version = '1.9.4';
var shownFile = 'none';

// 跟踪功能（当前为无操作模式）
// 如需启用分析，可将此函数替换为真实的分析服务实现
// 例如 Google Analytics 4、Plausible、Umami 等
function track(type, subtype) {
  // 无操作
}
