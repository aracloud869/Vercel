export default async function handler(req, res) {
  const { data } = req.query;

  if (!data) {
    return res.status(400).send("Thiếu tham số dữ liệu (?data=)");
  }

  try {
    let targetUrl = "";
    
    // Xử lý tham số truyền vào
    if (data === "68") {
      targetUrl = "https://now.gg/play/sugar-game-network-limited/9030/magic-forest-dragon-quest";
    } else {
      // Giải mã Base64
      targetUrl = Buffer.from(data, 'base64').toString('utf-8');
    }

    const originUrl = new URL(targetUrl);

    // Gửi request lấy dữ liệu từ máy chủ gốc
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': originUrl.origin
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Máy chủ gốc phản hồi lỗi: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // 1. Nếu dữ liệu trả về là HTML
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Script chặn trang gốc tự thay đổi/xóa URL parameter
      const antiBustScript = `
        <script>
          (function() {
            const noop = function() {};
            if (window.history && window.history.replaceState) {
              window.history.replaceState = noop;
              window.history.pushState = noop;
            }
          })();
        </script>
      `;
      html = html.replace('<head>', '<head>' + antiBustScript);

      // Chuyển toàn bộ link tương đối thành tuyệt đối dẫn về origin gốc
      html = html.replace(/(src|href|action)="(?!http|https|\/\/)([^"]+)"/g, (match, attr, path) => {
        try {
          return `${attr}="${new URL(path, originUrl.origin).href}"`;
        } catch (e) {
          return match;
        }
      });

      // Cấu hình các Header cho phép hiển thị trong iframe & CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *;");
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      return res.status(200).send(html);
    }

    // 2. Nếu là các tệp tài nguyên khác (CSS, JS, Hình ảnh,...)
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error("Proxy Error:", error);
    return res.status(500).send("Lỗi xử lý Proxy hệ thống Vercel.");
  }
}
