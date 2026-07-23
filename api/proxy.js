import { createProxyMiddleware } from 'http-proxy-middleware';

const proxyMiddleware = createProxyMiddleware({
  target: 'https://now.gg',
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
