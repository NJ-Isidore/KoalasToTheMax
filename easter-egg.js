"use strict";

// 彩蛋：按空格键自动随机展开圆形（独立模块，依赖 koala.js）
(function() {
  var autoInterval = null;

  function toggleAutoExpand() {
    if (autoInterval) {
      clearInterval(autoInterval);
      autoInterval = null;
    } else {
      autoInterval = setInterval(function() {
        // 调用 koala.makeCircles 返回的 splitRandom 方法
        var ctrl = koala._control;
        if (!ctrl || !ctrl.splitRandom()) {
          clearInterval(autoInterval);
          autoInterval = null;
        }
      }, 150);
    }
  }

  d3.select(document).on('keydown.koala-egg', function() {
    if (d3.event.which === 32) {
      toggleAutoExpand();
      d3.event.preventDefault();
    }
  });
})();
