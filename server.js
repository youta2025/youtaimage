const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

// 允许跨域请求
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 百度 AI 配置
const BAIDU_API_KEY = 'DYMyntOjJCTbCXCzHHQMbacq';
const BAIDU_SECRET_KEY = 'TsmmKFZquGdegjbLco8v3q4ugCVJ1EN5';

// 获取访问令牌
let accessToken = null;
let tokenExpires = 0;

async function getBaiduToken() {
    if (accessToken && Date.now() < tokenExpires) {
        return accessToken;
    }

    const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: BAIDU_API_KEY,
            client_secret: BAIDU_SECRET_KEY
        })
    });

    const data = await response.json();
    if (data.access_token) {
        accessToken = data.access_token;
        tokenExpires = Date.now() + (data.expires_in - 300) * 1000;
        return accessToken;
    }
    throw new Error('获取访问令牌失败');
}

// 代理百度 AI 的请求
app.post('/api/remove-bg', async (req, res) => {
    try {
        console.log('收到去除背景请求');
        const token = await getBaiduToken();
        console.log('获取到token:', token);
        
        const response = await fetch('https://aip.baidubce.com/rest/2.0/image-classify/v1/body_seg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                access_token: token,
                image: req.body.image,
                type: 'foreground'
            })
        });

        const data = await response.json();
        console.log('百度API响应:', data);
        res.json(data);
    } catch (error) {
        console.error('错误:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 