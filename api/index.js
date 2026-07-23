const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

function decodeBase64(str) {
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

// THAY ĐỔI Ở ĐÂY: Lắng nghe chính xác đường dẫn /server/url
app.get('/server/url', async (req, res) => {
    const encodedUrl = req.query.data;

    if (!encodedUrl) {
        return res.status(400).send('Thiếu tham số dữ liệu (?data=)');
    }

    const targetUrl = decodeBase64(encodedUrl);

    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).send('Định dạng URL không hợp lệ.');
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            responseType: 'text',
            timeout: 15000 // Tăng lên 15 giây cho các trang nặng
        });

        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.removeHeader('Content-Security-Policy');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        const baseUrl = targetUrl.endsWith('/') ? targetUrl : targetUrl + '/';
        const parsedUrl = new URL(targetUrl);
        const originUrl = parsedUrl.origin;

        const $ = cheerio.load(response.data);

        const fixAttribute = (selector, attr) => {
            $(selector).each((index, element) => {
                const rawVal = $(element).attr(attr);
                if (rawVal && !rawVal.startsWith('http') && !rawVal.startsWith('data:') && !rawVal.startsWith('//')) {
                    if (rawVal.startsWith('/')) {
                        $(element).attr(attr, originUrl + rawVal);
                    } else {
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

        return res.send($.html());

    } catch (error) {
        console.error('Lỗi Proxy:', error.message);
        return res.status(500).send(`Không thể tải trang web mục tiêu. Chi tiết lỗi: ${error.message}`);
    }
});

// Thêm một trang chào mừng ở trang chủ để tránh lỗi 404 khi vào link gốc
app.get('/', (req, res) => {
    res.send('Server Proxy đang hoạt động! Hãy sử dụng đường dẫn: /server/url?data=MÃ_BASE64');
});

module.exports = app;
