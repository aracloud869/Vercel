const { createProxyMiddleware } = require('http-proxy-middleware');

export default async function handler(req, res) {
  const { data } = req.query;
  if (!data) return res.status(400).send("Thiếu tham số dữ liệu (?data=)");

  try {
    let targetUrl = "";
    
    // Hỗ trợ cả mã số cố định 68 hoặc chuỗi Base64
    if (data === "68") {
      targetUrl = "https://now.gg";
    } else {
      targetUrl = Buffer.from(data, 'base64').toString('utf-8');
    }

    const originUrl = new URL(targetUrl);

    // Cấu hình Proxy toàn phần: Đánh lừa toàn bộ hệ thống kết nối ngầm ngầm của game
    const proxy = createProxyMiddleware({
      target: originUrl.origin,
      changeOrigin: true,
      ws: true, // Bắt buộc: Kích hoạt luồng truyền dữ liệu WebSocket cho game đám mây
      pathRewrite: {
        '^/server/url': originUrl.pathname, // Ép Vercel nhận diện đúng đường dẫn game
      },
      onProxyRes: function (proxyRes, req, res) {
        // Gỡ bỏ triệt để các rào cản chặn Iframe từ máy chủ gốc
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        proxyRes.headers['access-control-allow-origin'] = '*';
      }
    });

    return proxy(req, res);
  } catch (error) {
    return res.status(500).send("Lỗi cấu hình Proxy toàn phần.");
  }
}
�� link tài nguyên nội bộ sang link tuyệt đối gốc của game
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
