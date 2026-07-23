const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// THAY ĐỔI ĐỊA CHỈ TRANG WEB BẠN MUỐN NHÚNG Ở ĐÂY
const TARGET_URL = 'https://trang-web-bi-chan.com'; 

app.use('/', createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    selfHandleResponse: true, // Tự xử lý dữ liệu trả về để sửa lỗi đường dẫn
    onProxyReq: (proxyReq, req, res) => {
        // Giả lập như đang duyệt web thông thường
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        proxyReq.setHeader('Referer', TARGET_URL);
        proxyReq.setHeader('Origin', TARGET_URL);
    },
    onProxyRes: (proxyRes, req, res) => {
        // Sao chép các header từ server gốc sang, loại bỏ header chặn iframe
        Object.keys(proxyRes.headers).forEach((key) => {
            if (key !== 'x-frame-options' && key !== 'content-security-policy' && key !== 'content-length') {
                res.setHeader(key, proxyRes.headers[key]);
            }
        });
        
        // Cấu hình CORS để thoải mái nhúng
        res.setHeader('Access-Control-Allow-Origin', '*');

        let body = [];
        proxyRes.on('data', (chunk) => body.push(chunk));
        
        proxyRes.on('end', () => {
            body = Buffer.concat(body);
            
            // Nếu là trang HTML, tiến hành sửa toàn bộ link ảnh, css, js bị lỗi
            const contentType = proxyRes.headers['content-type'] || '';
            if (contentType.includes('text/html')) {
                let html = body.toString('utf8');
                
                // Thay thế các đường dẫn bắt đầu bằng / thành domain gốc (Sửa lỗi màn hình đen/vỡ ảnh)
                // Ví dụ: href="/css/style.css" -> href="https://trang-web-bi-chan.com"
                const baseUrl = TARGET_URL.endsWith('/') ? TARGET_URL.slice(0, -1) : TARGET_URL;
                
                html = html.replace(/(src|href)=\"\/(?!\/)/g, `$1="${baseUrl}/`);
                html = html.replace(/(src|href)=\'\/(?!\/)/g, `$1='${baseUrl}/`);
                
                res.end(html);
            } else {
                // Nếu là file ảnh, file tĩnh thông thường thì trả về trực tiếp
                res.end(body);
            }
        });
    }
}));

module.exports = app;
