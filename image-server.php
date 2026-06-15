<?
require('config.php');

function my_urlencode($string) {
  return str_replace(' ', '%20', $string);
}

// 验证 URL 是否安全（防止 SSRF 攻击）
function validate_url($url) {
  // 只允许 http 和 https 协议
  if (!preg_match('#^https?://#i', $url)) {
    return "只允许 http:// 和 https:// 协议";
  }

  $parsed = parse_url($url);
  if (!$parsed || empty($parsed['host'])) {
    return "无效的 URL 格式";
  }

  $host = strtolower($parsed['host']);

  // 阻止私有 IP 和保留地址
  $blocked_patterns = array(
    '/^localhost$/i',
    '/^127\./',
    '/^10\./',
    '/^172\.(1[6-9]|2[0-9]|3[01])\./',
    '/^192\.168\./',
    '/^169\.254\./',       // 云元数据端点
    '/^0\./',
    '/^::1$/',             // IPv6 回环
    '/^fe80:/i',           // IPv6 链路本地
    '/^fc00:/i',           // IPv6 私有
    '/^fd/i',              // IPv6 私有
  );
  foreach ($blocked_patterns as $pattern) {
    if (preg_match($pattern, $host)) {
      return "不允许访问内部网络地址";
    }
  }

  // 如果配置了域名白名单，则进行校验
  global $allowed_domains;
  if (isset($allowed_domains) && is_array($allowed_domains) && count($allowed_domains) > 0) {
    $domain_allowed = false;
    foreach ($allowed_domains as $domain) {
      $domain = strtolower($domain);
      if ($host === $domain || substr($host, -(strlen($domain) + 1)) === '.' . $domain) {
        $domain_allowed = true;
        break;
      }
    }
    if (!$domain_allowed) {
      return "域名不在白名单中";
    }
  }

  return null; // 验证通过
}

try {
  $ok = true;

  // 检查 URL 参数
  if ($ok && isset($_GET["url"])) {
    $url = urldecode($_GET["url"]);

    // 安全校验
    $error = validate_url($url);
    if ($error !== null) {
      header('HTTP/1.0 403 Forbidden');
      echo "请求被拒绝：" . $error;
      $ok = false;
    } else {
      // 生成哈希文件名
      $filename = get_filename($url);
    }
  } else {
    header('HTTP/1.0 400 Bad Request');
    echo "No URL was specified";
    $ok = false;
  }

  if ($ok) {
    if (file_exists($filename)) {
      // 读取缓存文件（跳过垃圾前缀）
      $file = file_get_contents($filename, false, NULL, strlen($garbage));
    } else {
      // 设置请求超时和大小限制
      $context = stream_context_create(array(
        'http' => array(
          'timeout' => 10,
          'max_redirects' => 3,
          'follow_location' => true,
        )
      ));

      $file = @file_get_contents(my_urlencode($url), false, $context);
      if ($file === false) {
        header('HTTP/1.0 502 Bad Gateway');
        echo "无法获取远程图片";
        $ok = false;
      } else {
        // 检查文件大小（限制 10MB）
        if (strlen($file) > 10 * 1024 * 1024) {
          header('HTTP/1.0 413 Payload Too Large');
          echo "图片文件过大";
          $ok = false;
        } else {
          // 验证是否为有效图片
          $img = imagecreatefromstring($file);
          if ($img) {
            $max = 800;
            $w = imagesx($img);
            $h = imagesy($img);
            if ($w > $max || $h > $max) {
              $scale = min($max / $w, $max / $h);
              $new_w = intval($scale * $w);
              $new_h = intval($scale * $h);
              $new_img = imagecreatetruecolor($new_w, $new_h);
              imagecopyresampled($new_img, $img, 0, 0, 0, 0, $new_w, $new_h, $w, $h);
              imagedestroy($img);
              imagejpeg($new_img, $filename);
              $file = file_get_contents($filename);
            }

            file_put_contents($filename, $garbage);
            file_put_contents($filename, $file, FILE_APPEND);
          } else {
            header('HTTP/1.0 400 Bad Request');
            print "Invalid image specified";
            $ok = false;
          }
        }
      }
    }
  }

  if ($ok) {
    header('Content-Type: image/jpeg');
    print($file);
  }

} catch (Exception $e) {
  header('HTTP/1.0 500 Internal Server Error');
  echo "Internal Server Error";
  $ok = false;
}
?>
