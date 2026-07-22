import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { data } = req.query;
  if (!data) return res.status(400).send("Thiếu tham số dữ liệu (?data=)");

  try {
    const targetUrl = Buffer.from(data, 'base64').toString('utf-8');
    const originUrl = new URL(targetUrl);

    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': req.headers['user-agent'],
        'Referer': originUrl.origin
      }
    });
    let html = await response.text();

    // 1. CHẶN KHÔNG CHO SỬA LINK: Đè lệnh đóng băng history và location không cho mã bảo mật xóa tham số data=
    const antiBustScript = `
      <script>
        (function() {
          // Khóa tính năng thay đổi URL thanh địa chỉ bằng javascript ngầm
          const noop = function() {};
          if (window.history && window.history.replaceState) {
            window.history.replaceState = noop;
            window.history.pushState = noop;
          }
          // Ngăn không cho trang web tự động phá vỡ cấu trúc khung nhúng
          window.onbeforeunload = function() { return "Đang chặn chuyển hướng ngoài ý muốn..."; };
        })();
      </script>
    `;
    // Chèn đoạn mã chặn này lên đầu thẻ <head> của trang web game
    html = html.replace('<head>', '<head>' + antiBustScript);

    // 2. Chuyển đổi toàn bộ link tài nguyên nội bộ sang link tuyệt đối gốc của game
    html = html.replace(/(src|href|action)="(?!http|https|\/\/)([^"]+)"/g, (match, attr, path) => {
      const absoluteUrl = new URL(path, originUrl.origin).href;
      return `${attr}="${absoluteUrl}"`;
    });

    // 3. Thiết lập các cấu hình Header bẻ khóa iframe bảo mật rộng rãi nhất
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *;");
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send("Lỗi xử lý hệ thống mã nguồn Proxy.");
  }
}
