const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Hàm giải mã mã chuỗi Base64 thành URL thông thường
function decodeBase64(str) {
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

app.use('/', (req, res, next) => {
    // Lấy chuỗi mã hóa từ tham số ?data=
    const encodedUrl = req.query.data; 
    
    if (!encodedUrl) {
        return res.status(400).send('Thiếu tham số dữ liệu (?data=)');
    }

    // Giải mã Base64 để lấy URL gốc của trang web cần nhúng
    const targetUrl = decodeBase64(encodedUrl);
    
    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).send('Định dạng URL sau khi giải mã không hợp lệ.');
    }

    // Cấu hình Proxy động theo URL vừa giải mã
    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        selfHandleResponse: true, 
        onProxyReq: (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            proxyReq.setHeader('Referer', targetUrl);
            proxyReq.setHeader('Origin', targetUrl);
        },
        onProxyRes: (proxyRes, req, res) => {
            // Sao chép và lọc bỏ các Header chặn iframe
            Object.keys(proxyRes.headers).forEach((key) => {
                if (key !== 'x-frame-options' && key !== 'content-security-policy' && key !== 'content-length') {
                    res.setHeader(key, proxyRes.headers[key]);
                }
            });
            
            res.setHeader('Access-Control-Allow-Origin', '*');

            let body = [];
            proxyRes.on('data', (chunk) => body.push(chunk));
            
            proxyRes.on('end', () => {
                body = Buffer.concat(body);
                const contentType = proxyRes.headers['content-type'] || '';
                
                if (contentType.includes('text/html')) {
                    let html = body.toString('utf8');
                    
                    // Lấy domain gốc (Xử lý cắt bỏ dấu gạch chéo ở cuối nếu có)
                    const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
                    
                    // Sửa lỗi hình ảnh, CSS, JS đường dẫn tương đối thành tuyệt đối
                    html = html.replace(/(src|href)=\"\/(?!\/)/g, `$1="${baseUrl}/`);
                    html = html.replace(/(src|href)=\'\/(?!\/)/g, `$1='${baseUrl}/`);
                    
                    res.end(html);
                } else {
                    res.end(body);
                }
            });
        }
    })(req, res, next);
});

module.exports = app;
