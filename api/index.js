const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// Hàm giải mã Base64 sang URL
function decodeBase64(str) {
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

app.get('/', async (req, res) => {
    const encodedUrl = req.query.data;

    if (!encodedUrl) {
        return res.status(400).send('Thiếu tham số dữ liệu (?data=)');
    }

    const targetUrl = decodeBase64(encodedUrl);

    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).send('Định dạng URL không hợp lệ.');
    }

    try {
        // Tải nội dung từ trang gốc, cấu hình chống chặn IP và tự động giải nén dữ liệu
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            responseType: 'text',
            timeout: 10000 // Giới hạn 10 giây để tránh treo Serverless
        });

        // Vô hiệu hóa triệt để các Header chặn iframe
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.removeHeader('Content-Security-Policy');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        const baseUrl = targetUrl.endsWith('/') ? targetUrl : targetUrl + '/';
        const parsedUrl = new URL(targetUrl);
        const originUrl = parsedUrl.origin;

        // Sử dụng cheerio để phân tích cú pháp HTML và sửa đổi link
        const $ = cheerio.load(response.data);

        // 1. Sửa toàn bộ liên kết hình ảnh, script, css, link neo
        const fixAttribute = (selector, attr) => {
            $(selector).each((index, element) => {
                const rawVal = $(element).attr(attr);
                if (rawVal && !rawVal.startsWith('http') && !rawVal.startsWith('data:') && !rawVal.startsWith('//')) {
                    if (rawVal.startsWith('/')) {
                        // Đường dẫn tuyệt đối từ gốc domain (Ví dụ: /assets/main.js -> https://domain.com)
                        $(element).attr(attr, originUrl + rawVal);
                    } else {
                        // Đường dẫn tương đối từ thư mục hiện tại (Ví dụ: assets/main.js -> https://domain.com)
                        $(element).attr(attr, baseUrl + rawVal);
                    }
                }
            });
        };

        fixAttribute('img', 'src');
        fixAttribute('link', 'href');
        fixAttribute('script', 'src');
        fixAttribute('a', 'href');
        fixAttribute('source', 'src');

        // Trả về chuỗi HTML hoàn chỉnh đã sửa lỗi link
        return res.send($.html());

    } catch (error) {
        console.error('Lỗi Proxy:', error.message);
        return res.status(500).send(`Không thể tải trang web mục tiêu. Chi tiết lỗi: ${error.message}`);
    }
});

module.exports = app;
