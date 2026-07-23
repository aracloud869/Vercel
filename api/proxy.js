import { createProxyMiddleware } from 'http-proxy-middleware';

const proxyMiddleware = createProxyMiddleware({
  target: 'https://export default async function handler(req, res) {
  const { data } = req.query;
  if (!data) return res.status(400).send("Thiếu tham số dữ liệu (?data=)");

  try {
    let targetUrl = "";
    if (data === "68") {
      targetUrl = "https://now.gg";
    } else {
      targetUrl = Buffer.from(data, 'base64').toString('utf-8');
    }

    const originUrl = new URL(targetUrl);

    // Tự động lấy dữ liệu từ máy chủ game gốc
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Referer': originUrl.origin
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Máy chủ game phản hồi lỗi: ${response.status}`);
    }

    let contentType = response.headers.get('content-type') || '';
    
    // Nếu là trang HTML, tiến hành bẻ khóa bảo mật và đồng bộ toàn bộ link liên kết ngầm
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // KHÓA CỨNG: Chặn mã JavaScript độc quyền của game tự động xóa tham số data= trên URL
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

      // ĐỒNG BỘ: Biến tất cả link nội bộ (/, ./, ../) thành link tuyệt đối dẫn thẳng tới now.gg
      html = html.replace(/(src|href|action)="(?!http|https|\/\/)([^"]+)"/g, (match, attr, path) => {
        try {
          const absoluteUrl = new URL(path, originUrl.origin).href;
          return `${attr}="${absoluteUrl}"`;
        } catch(e) {
          return match;
        }
      });

      // Trả file HTML sạch về cho trình duyệt
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *;");
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // Nếu là các tệp tài nguyên khác (ảnh, css, js), tiến hành truyền trực tiếp dữ liệu thô (Pipe Stream)
    const dataBuffer = await response.arrayBuffer();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(Buffer.from(dataBuffer));

  } catch (error) {
    return res.status(500).send("Lỗi xử lý Proxy hệ thống Vercel.");
  }
}
.gg',
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    '^/server/url': '', 
  },
  onProxyRes: function (proxyRes) {
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];
    proxyRes.headers['access-control-allow-origin'] = '*';
  }
});

export default function handler(req, res) {
  const { data } = req.query;
  if (!data) return res.status(400).send("Thiếu tham số dữ liệu (?data=)");

  try {
    let targetUrl = "";
    if (data === "68") {
      targetUrl = "https://now.gg/play/sugar-game-network-limited/9030/magic-forest-dragon-quest";
    } else {
      targetUrl = Buffer.from(data, 'base64').toString('utf-8');
    }

    const originUrl = new URL(targetUrl);
    proxyMiddleware.options.target = originUrl.origin;
    proxyMiddleware.options.pathRewrite['^/server/url'] = originUrl.pathname;

    return proxyMiddleware(req, res);
  } catch (error) {
    return res.status(500).send("Lỗi cấu hình Proxy toàn phần.");
  }
}
ers['x-frame-options'];
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
