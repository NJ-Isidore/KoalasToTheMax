<?
// 将此文件重命名为 config.php 并修改以下配置

// 用于混淆缓存文件名的前缀字符串
$garbage = "some_garbage_string_to_be_used_for_redneck_encryption";

// 允许的图片来源域名（留空数组则不限制域名）
// 支持子域名匹配：如 'imgur.com' 同时允许 'i.imgur.com'
$allowed_domains = array(
  'imgur.com',
  'flickr.com',
  'staticflickr.com',
  'wikimedia.org',
  'wikipedia.org',
  'googleusercontent.com',
  'twimg.com',
  'pinimg.com',
);

// 根据 URL 生成哈希文件名的函数
function get_filename($url) {
  // 请确保缓存目录存在
  return "path/to/cache/dir/" . md5('something_to_prepend_' . $url . '_sometihng_to_append') . ".extension";
}
?>
