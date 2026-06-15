"use strict";

// 应用主逻辑（从 index.html 提取）
(function() {
  // 全局错误追踪（最多报告 5 次，避免刷屏）
  var errorCount = 0;
  window.onerror = function(msg, url, ln) {
    if (errorCount >= 5) return;
    msg = msg.toString();
    if (msg === 'Script error.' && url === '' && ln === 0) return;
    errorCount++;
    console.error('[KoalasToTheMax]', msg, 'in', url, '@', ln);
    track('OnError', "'" + msg + "' in '" + url + "' @ " + ln);
  };

  // 环境检测
  if (!koala.supportsCanvas()) {
    alert("Sorry, KoalasToTheMax needs HTML5 Canvas support.");
    return;
  }
  if (!koala.supportsSVG()) {
    alert("Sorry, KoalasToTheMax needs SVG support.");
    return;
  }
  if (!window.d3) {
    alert("D3 was not loaded. Try refreshing the page.");
    return;
  }

  // Base64 工具函数（处理 UTF-8 编码）
  function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }

  function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
  }

  // URL 解析
  // 支持的 URL 格式：
  // 1. DOMAIN — 加载默认随机图片
  // 2. DOMAIN?<base64> — base64 编码的图片 URL / URL 数组 / 配置对象
  // 3. DOMAIN?<image_url> — 自动重编码为 base64 格式
  function goToHidden(loc, str) {
    loc.href = '//' + loc.host + loc.pathname + '?' + utf8_to_b64(str);
  }

  function basicLoad(loc) {
    var possible = ['01', '02'];
    var file = 'img/' + possible[Math.floor(Math.random() * possible.length)] + '.jpg';
    return {
      file: file,
      shownFile: loc.protocol + '//' + loc.host + loc.pathname + file
    };
  }

  function parseUrl(loc) {
    var href = loc.href;
    var idx = href.indexOf('?');
    if (idx === -1 || idx === href.length - 1) {
      return basicLoad(loc);
    }

    var param = href.substr(idx + 1);
    if (!/^[a-z0-9+\/]+=*$/i.test(param)) {
      goToHidden(loc, param);
      return null;
    }

    try {
      param = b64_to_utf8(param);
    } catch (e) {
      return basicLoad(loc);
    }

    try {
      param = JSON.parse(param);
    } catch (e) {
      return { file: param, shownFile: param };
    }

    if (Array.isArray(param) && param.length) {
      var file = param[Math.floor(Math.random() * param.length)];
      return { file: file, shownFile: file };
    }

    if (Array.isArray(param.images) && param.images.length) {
      var imgFile = param.images[Math.floor(Math.random() * param.images.length)];
      return {
        file: imgFile,
        shownFile: imgFile,
        background: param.background,
        hideNote: param.hideNote
      };
    }

    return basicLoad(loc);
  }

  // 初始化
  try {
    var parse = parseUrl(location);
    if (!parse) return;
    var file = parse.file;
    // shownFile 是全局变量（声明在 tracking.js），用于跟踪当前加载的图片来源
    shownFile = parse.shownFile;

    if (parse.background) {
      d3.select(document.body).style('background', parse.background);
    }
    if (parse.hideNote) {
      d3.select('#footer').style('display', 'none');
    }

    if (/^https?:/.test(file)) {
      file = "image-server.php?url=" + file;
    }

    // 事件回调
    function onEvent(what, value) {
      track(what, value);

      if (what === 'LayerClear' && value == 0) {
        d3.select('#next')
          .style('display', null)
          .select('input')
            .on('keydown', function() {
              d3.select('div.err').remove();
              if (d3.event.keyCode !== 13) return;
              var input = d3.select(this).property('value');

              if (input.match(/^https?:\/\/.+\..+/i)) {
                track('Submit', input);
                d3.select('#next div.msg').text('Thinking...');
                d3.select(this).style('display', 'none');
                setTimeout(function() {
                  goToHidden(location, input);
                }, 750);
              } else {
                d3.select('#next').selectAll('div.err').data([0])
                  .enter().append('div')
                  .attr('class', "err")
                  .text("Invalid image URL. It should start with 'http://' or 'https://'");
              }
            });
      }
    }

    // 加载图片
    var img = new Image();
    img.onload = function() {
      var colorData;
      try {
        colorData = koala.loadImage(this);
      } catch (e) {
        colorData = null;
        track('BadLoad', "Msg: '" + e.message + "' file: '" + file + "'");
        alert("Sorry, KoalasToTheMax could not load the image '" + file + "'");
        setTimeout(function() {
          window.location.href = location.protocol + '//' + location.host + location.pathname;
        }, 750);
      }
      if (colorData) {
        koala._control = koala.makeCircles("#dots", colorData, onEvent);
        track('GoodLoad', 'Yay');
      }
    };
    img.src = file;
  } catch (e) {
    console.error('[KoalasToTheMax] 初始化错误:', e);
    track('Problemo', String(e.message));
  }

  // SVG 导出下载
  var saveNumber = 0;
  d3.select('#love').on('click', function() {
    saveNumber++;
    track('SaveSVG', saveNumber);
    var svgData = d3.select('#dots').html();
    if (svgData.indexOf('<svg') !== -1) {
      var prefix = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<!-- Generator: KoalasToTheMax.com -->',
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
      ];
      saveAs(new Blob(
        [svgData.replace('<svg', prefix.join(' ') + '<svg')],
        {type: "text/plain;charset=utf-8"}
      ), "KoalasToTheMax.svg");
    } else {
      track('SaveSVG', 'Fail');
    }
  });
})();
