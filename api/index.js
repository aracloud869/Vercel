const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

function decodeBase64(str) {
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

app.use('/', (req, res, next) => {
    const encodedUrl = req.query.data; 
    
    if (!encodedUrl) {
        return res.status(400).send('Thiếu tham số dữ liệu (?data=)');
    }

    const targetUrl = decodeBase64(encodedUrl);
    
    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).send('Định dạng URL không hợp lệ.');
    }

    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        selfHandleResponse: true, 
        onProxyReq: (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            proxyReq.setHeader('Referer', targetUrl);
            proxyReq.setHeader('Origin', targetUrl);
        },
        onProxyRes: (proxyRes, req, res) => {
            Object.keys(proxyRes.headers).forEach((key) => {
                if (!['x-frame-options', 'content-security-policy', 'content-length'].includes(key.toLowerCase())) {
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
                    const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
                    
                    // Sửa lỗi đường dẫn ảnh, css, js tuyệt đối
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
