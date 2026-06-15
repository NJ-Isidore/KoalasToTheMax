"use strict";

/*
* Made with love by Vadim Ogievetsky for Annie Albagli (Valentine's Day 2011)
* Powered by Mike Bostock's D3
*
* For me on GitHub:  https://github.com/vogievetsky/KoalasToTheMax
* License: MIT  [ http://koalastothemax.com/LICENSE ]
*
* Easter egg: use your own image via ?<image_url> or ?<base64_url>
*/

var koala = { version: '1.8.2' };

(function() {
  function array2d(w, h) {
    var a = [];
    return function(x, y, v) {
      if (x < 0 || y < 0) return void 0;
      if (arguments.length === 3) {
        return a[w * x + y] = v;
      } else if (arguments.length === 2) {
        return a[w * x + y];
      } else {
        throw new TypeError("Bad number of arguments");
      }
    }
  }

  function avgColor(x, y, z, w) {
    return [
      (x[0] + y[0] + z[0] + w[0]) / 4,
      (x[1] + y[1] + z[1] + w[1]) / 4,
      (x[2] + y[2] + z[2] + w[2]) / 4
    ];
  }

  koala.supportsCanvas = function() {
    var elem = document.createElement('canvas');
    return !!(elem.getContext && elem.getContext('2d'));
  };

  koala.supportsSVG = function() {
    return !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect;
  };

  function Circle(vis, xi, yi, size, color, children, layer, onSplit) {
    this.vis = vis;
    this.x = size * (xi + 0.5);
    this.y = size * (yi + 0.5);
    this.size = size;
    this.color = color;
    this.rgb = d3.rgb(color[0], color[1], color[2]);
    this.children = children;
    this.layer = layer;
    this.onSplit = onSplit;
  }

  Circle.prototype.isSplitable = function() {
    return this.node && this.children
  }

  Circle.prototype.split = function() {
    if (!this.isSplitable()) return;
    d3.select(this.node).remove();
    delete this.node;
    Circle.addToVis(this.vis, this.children);
    this.onSplit(this);
  }

  Circle.prototype.checkIntersection = function(sx, sy, ex, ey) {
    var edx = this.x - ex, edy = this.y - ey,
        sdx = this.x - sx, sdy = this.y - sy,
        r2  = this.size / 2;
    r2 = r2 * r2; // Radius squared
    // End point is inside the circle and start point is outside
    return edx * edx + edy * edy <= r2 && sdx * sdx + sdy * sdy > r2;
  }

  Circle.addToVis = function(vis, circles, init) {
    var circle = vis.selectAll('.nope').data(circles)
      .enter().append('circle');
    if (init) {
      circle = circle
        .attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; })
        .attr('r', 4)
        .attr('fill', '#ffffff')
          .transition().duration(1000);
    } else {
      circle = circle
        .attr('cx',   function(d) { return d.parent.x; })
        .attr('cy',   function(d) { return d.parent.y; })
        .attr('r',    function(d) { return d.parent.size / 2; })
        .attr('fill', function(d) { return String(d.parent.rgb); })
        .attr('fill-opacity', 0.68)
          .transition().duration(300);
    }
    circle
      .attr('cx',   function(d) { return d.x; })
      .attr('cy',   function(d) { return d.y; })
      .attr('r',    function(d) { return d.size / 2; })
      .attr('fill', function(d) { return String(d.rgb); })
      .attr('fill-opacity', 1)
      .each('end',  function(d) { d.node = this; });
  }

  var vis, maxSize = 512, minSize = 4, dim = maxSize / minSize;

  koala.loadImage = function(imageData) {
    var canvas = document.createElement('canvas').getContext('2d');
    canvas.drawImage(imageData, 0, 0, dim, dim);
    return canvas.getImageData(0, 0, dim, dim).data;
  };

  koala.makeCircles = function(selector, colorData, onEvent) {
    onEvent = onEvent || function() {};
    var splitableByLayer = [],
        splitableRemaining = 0,
        splitableTotal = 0,
        nextPercent = 0;

    function onSplit(circle) {
      var layer = circle.layer;
      splitableByLayer[layer]--;
      splitableRemaining--;
      if (splitableByLayer[layer] === 0) {
        onEvent('LayerClear', layer);
      }
      var percent = 1 - splitableRemaining / splitableTotal;
      if (percent >= nextPercent) {
        onEvent('PercentClear', Math.round(nextPercent * 100));
        nextPercent += 0.05;
      }
    }

    // 创建或清空 SVG
    if (!vis) {
      vis = d3.select(selector).append("svg")
        .attr("width", maxSize).attr("height", maxSize)
        .attr("viewBox", "0 0 " + maxSize + " " + maxSize)
        .attr("preserveAspectRatio", "xMidYMid meet");
    } else {
      vis.selectAll('circle').remove();
    }

    // 构建四叉树
    var finestLayer = array2d(dim, dim);
    var size = minSize;
    var xi, yi, t = 0, color;
    for (yi = 0; yi < dim; yi++) {
      for (xi = 0; xi < dim; xi++) {
        color = [colorData[t], colorData[t+1], colorData[t+2]];
        finestLayer(xi, yi, new Circle(vis, xi, yi, size, color));
        t += 4;
      }
    }

    var layer, prevLayer = finestLayer;
    var c1, c2, c3, c4, currentLayer = 0;
    while (size < maxSize) {
      dim /= 2;
      size = size * 2;
      layer = array2d(dim, dim);
      for (yi = 0; yi < dim; yi++) {
        for (xi = 0; xi < dim; xi++) {
          c1 = prevLayer(2 * xi,     2 * yi);
          c2 = prevLayer(2 * xi + 1, 2 * yi);
          c3 = prevLayer(2 * xi,     2 * yi + 1);
          c4 = prevLayer(2 * xi + 1, 2 * yi + 1);
          color = avgColor(c1.color, c2.color, c3.color, c4.color);
          c1.parent = c2.parent = c3.parent = c4.parent = layer(xi, yi,
            new Circle(vis, xi, yi, size, color, [c1, c2, c3, c4], currentLayer, onSplit)
          );
        }
      }
      splitableByLayer.push(dim * dim);
      splitableTotal += dim * dim;
      currentLayer++;
      prevLayer = layer;
    }
    splitableRemaining = splitableTotal;
    Circle.addToVis(vis, [layer(0, 0)], true);

    // 交互辅助函数
    function splitableCircleAt(x, y) {
      var xi = Math.floor(x / minSize),
          yi = Math.floor(y / minSize),
          circle = finestLayer(xi, yi);
      if (!circle) return null;
      while (circle && !circle.isSplitable()) circle = circle.parent;
      return circle || null;
    }

    function findAndSplit(startPoint, endPoint) {
      var dx = endPoint[0] - startPoint[0],
          dy = endPoint[1] - startPoint[1],
          length = Math.sqrt(dx * dx + dy * dy),
          numSplits = Math.max(Math.ceil(length / 4), 1),
          stepX = dx / numSplits,
          stepY = dy / numSplits,
          spX = startPoint[0], spY = startPoint[1],
          epX, epY;
      for (var i = 0; i < numSplits; i++) {
        epX = spX + stepX;
        epY = spY + stepY;
        var circle = splitableCircleAt(epX, epY);
        if (circle && circle.isSplitable() && circle.checkIntersection(spX, spY, epX, epY)) {
          circle.split();
        }
        spX = epX;
        spY = epY;
      }
    }

    // 鼠标事件
    var prevMousePosition = null;
    function onMouseMove() {
      var mousePosition = d3.mouse(vis.node());
      if (isNaN(mousePosition[0])) { prevMousePosition = null; return; }
      if (prevMousePosition) {
        findAndSplit(prevMousePosition, mousePosition);
      }
      prevMousePosition = mousePosition;
      d3.event.preventDefault();
    }

    // 触摸事件
    var prevTouchPositions = {};
    function onTouchMove() {
      var touchPositions = d3.touches(vis.node());
      for (var touchIndex = 0; touchIndex < touchPositions.length; touchIndex++) {
        var touchPosition = touchPositions[touchIndex];
        var prevTouchPosition = prevTouchPositions[touchPosition.identifier]
        if (prevTouchPosition) {
          findAndSplit(prevTouchPosition, touchPosition);
        }
        prevTouchPositions[touchPosition.identifier] = touchPosition;
      }
      d3.event.preventDefault();
    }

    function onTouchEnd() {
      var touches = d3.event.changedTouches;
      for (var touchIndex = 0; touchIndex < touches.length; touchIndex++) {
        var touch = touches.item(touchIndex);
        delete prevTouchPositions[touch.identifier];
      }
      d3.event.preventDefault();
    }

    d3.select(document.body)
      .on('mousemove.koala', onMouseMove)
      .on('touchmove.koala', onTouchMove)
      .on('touchend.koala', onTouchEnd)
      .on('touchcancel.koala', onTouchEnd);

    // 暴露控制接口（供 easter-egg.js 等外部模块使用）
    function splitRandom() {
      var gridDim = maxSize / minSize;
      for (var attempt = 0; attempt < 50; attempt++) {
        var rx = Math.floor(Math.random() * gridDim);
        var ry = Math.floor(Math.random() * gridDim);
        var c = finestLayer(rx, ry);
        while (c && !c.isSplitable()) c = c.parent;
        if (c && c.isSplitable()) { c.split(); return true; }
      }
      return false;
    }
    return { splitRandom: splitRandom };
  };
})();
