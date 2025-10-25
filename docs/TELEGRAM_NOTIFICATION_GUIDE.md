# Telegram Bot 通知功能指南

## 概述

PicoPics V2 集成了 Telegram Bot 通知功能，当系统发生重要事件时会自动发送通知到指定的 Telegram 群组或个人。

## 配置

### 1. 环境变量配置

在 `wrangler.toml` 或 Cloudflare Workers 环境变量中添加：

```toml
[env.production.vars]
TELEGRAM_BOT_TOKEN = "your-bot-token"
TELEGRAM_CHAT_ID = "your-chat-id"
```

### 2. 获取 Bot Token

1. 在 Telegram 搜索 @BotFather
2. 发送 `/newbot` 创建新机器人
3. 按照提示设置机器人名称和用户名
4. 获取 Bot Token（例如：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

### 3. 获取 Chat ID

#### 方法 1：群组 Chat ID

1. 将机器人添加到群组
2. 发送任意消息到群组
3. 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 在响应中找到 `chat.id` 字段

#### 方法 2：个人 Chat ID

1. 在 Telegram 搜索你的机器人
2. 发送 `/start` 消息
3. 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 在响应中找到个人 `chat.id` 字段

## 通知事件

以下事件会触发 Telegram 通知：

### 📤 图片上传成功

- **触发时机**：用户成功上传图片
- **通知内容**：
  - 用户 ID
  - 文件名
  - 文件大小
  - 图片链接
  - 上传时间

### 🗑️ 图片删除

- **触发时机**：用户删除图片
- **通知内容**：
  - 用户 ID
  - 文件名
  - 对象键
  - 删除时间

### 🚫 IP 封禁

- **触发时机**：管理员将 IP 添加到黑名单
- **通知内容**：
  - IP 地址
  - 封禁原因
  - 封禁时长
  - 操作者
  - 封禁时间

### ✅ IP 解封

- **触发时机**：管理员从黑名单移除 IP
- **通知内容**：
  - IP 地址
  - 操作者
  - 解封时间

## 消息格式

### HTML 格式

所有消息使用 HTML 格式，支持以下标签：

- `<b>bold</b>` - 粗体
- `<i>italic</i>` - 斜体
- `<code>code</code>` - 等宽字体
- `<a href="url">link</a>` - 链接
- `<pre>preformatted</pre>` - 预格式化文本

### 示例消息

```
📤 图片上传成功

👤 用户ID: 12345678
📷 文件名: image.jpg
📊 大小: 2.45 MB
🔗 链接: 查看图片
🕐 时间: 2025/01/15 14:30:25
```

## 通知静默模式

部分通知会使用静默模式（不发出声音）：

- ✅ IP 解封
- 🗑️ 图片删除

重要通知会发出声音提醒：

- 📤 图片上传成功
- 🚫 IP 封禁
- ⚠️ 内容审核警告

## 错误处理

### 配置缺失

如果未配置 Bot Token 或 Chat ID，系统会：

- 在控制台输出警告日志
- 继续执行正常流程（不影响业务）

### 发送失败

如果 Telegram API 调用失败：

- 记录错误日志
- 不影响业务逻辑
- 不重试发送

## 扩展自定义通知

可以在代码中添加自定义通知：

```typescript
// 发送自定义消息
const message = `
🔔 <b>自定义通知</b>

📝 内容: ${content}
🕐 时间: ${new Date().toLocaleString("zh-CN")}
`.trim();

await sendTelegramNotification(env, message);
```

## 安全建议

1. **保护 Bot Token**：不要在代码库中提交真实的 Bot Token
2. **限制 Chat ID**：只允许特定用户或群组接收通知
3. **敏感信息**：避免在通知中暴露敏感用户数据
4. **频率控制**：高频操作建议批量发送通知

## 部署步骤

1. 更新 `wrangler.toml` 添加环境变量
2. 重新部署 Worker：
   ```bash
   npx wrangler deploy workers/uploader.ts --name uploader-worker-v2-prod --env production
   ```
3. 测试通知功能：
   - 上传一张图片
   - 检查 Telegram 是否收到通知

## 故障排查

### 问题：收不到通知

**检查清单：**

1. ✅ Bot Token 是否正确配置
2. ✅ Chat ID 是否正确配置
3. ✅ 机器人是否被添加到群组（群组通知）
4. ✅ 是否与机器人对话过（个人通知）
5. ✅ Worker 日志是否有错误

### 问题：消息格式错误

**可能原因：**

- HTML 标签未正确转义
- 特殊字符未处理
- 消息过长（Telegram 限制约 4096 字符）

**解决方法：**

- 检查 `escapeHtml` 函数
- 截断过长内容
- 使用 `<pre>` 标签格式化复杂内容

## 性能考虑

- 所有 Telegram 通知都是异步发送，不阻塞主流程
- 使用 `.catch()` 捕获错误，避免影响业务
- 建议在高频操作时使用批量通知

## 相关文件

- `workers/uploader.ts` - 主要通知逻辑
- `lib/telegram-bot.ts` - Telegram Bot 服务（预留）
- `wrangler.toml` - 环境配置

## 更新日志

- 2025-01-15: 初始实现
  - 支持图片上传/删除通知
  - 支持 IP 封禁/解封通知
  - HTML 格式消息
  - 异步通知机制
