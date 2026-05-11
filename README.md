# SaveMyParking

这是一个用于记录停车开始时间、提醒挪车并保存停车位置的前端项目，当前同时包含 Web 版和微信小程序版两套实现。

## Web 版本地运行

前置条件：`Node.js`

1. 安装依赖：`npm install`
2. 复制 `.env.example` 为 `.env.local`
3. 按需配置 `VITE_PARKING_RULE_API_URL`
4. 启动开发环境：`npm run dev`

说明：
- Web 端不再内置任何第三方模型密钥。
- `VITE_PARKING_RULE_API_URL` 为空时，AI 规则解析会自动降级为手动设置，不影响核心停车计时功能。
- 规则解析接口约定为 `POST` JSON：`{ "text": "停车规则原文" }`
- 接口返回需包含 `intervalMinutes`、`gracePeriodMinutes`、`explanation` 三个字段；也兼容 `{ "data": { ... } }` 包装格式。

## 微信小程序配置

1. 复制 `xiaochengxu/config.example.js` 为 `xiaochengxu/config.js`
2. 在 `config.js` 中按需配置 `parkingRuleApiUrl`
3. 用微信开发者工具打开根目录的 `project.config.json`

说明：
- 小程序端同样不再内置任何第三方模型密钥。
- 未配置 `parkingRuleApiUrl` 时，AI 规则解析会自动降级为手动设置。
