const fetch = require('node-fetch');

export default async function handler(req, res) {
  const { data } = req.query;
  if (!data) return res.status(400).send("Thiếu tham số dữ liệu (?data=)");

  try {
    // 1. Giải mã Base64 để lấy URL game gốc
    const targetUrl = Buffer.from(data, 'base64').toString('utf-8');
    const originUrl = new URL(targetUrl);

    // 2. Tải toàn bộ nội dung trang web về máy chủ Vercel
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': req.headers['user-agent'] }
    });
    let html = await response.text();

    // 3. KỸ THUẬT CRITICAL: Sửa toàn bộ link tài nguyên thô (/, ./, ../) thành link tuyệt đối của now.gg
    // Điều này đánh lừa trình duyệt rằng mọi tài nguyên vẫn đang tải hợp pháp
    html = html.replace(/(src|href|action)="(?!http|https|\/\/)([^"]+)"/g, (match, attr, path) => {
      const absoluteUrl = new URL(path, originUrl.origin).href;
      return `${attr}="${absoluteUrl}"`;
    });

    // 4. Cấu hình Header cho phép nhúng tự do vào Iframe không bị chặn
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *;");
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // 5. Trả kết quả đã bẻ khóa về cho iframe hiển thị
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send("Lỗi xử lý Proxy hệ thống.");
  }
}
