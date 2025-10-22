# History Worker

处理用户图片历史记录查询的 Cloudflare Worker。

## 功能

- 验证用户 GitHub OAuth 身份
- 查询用户的所有图片记录
- 返回图片元数据列表

## API 端点

### GET /api/history

获取当前登录用户的所有图片历史记录。

**请求头：**
```
Authorization: Bearer <github_access_token>
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "imageId": "1jF2quri2W3uxc7oBBwjcBewAZVBlfST",
      "userId": "12345",
      "r2ObjectKey": "12345/1jF2quri2W3uxc7oBBwjcBewAZVBlfST.jpg",
      "filename": "1jF2quri2W3uxc7oBBwjcBewAZVBlfST.jpg",
      "uploadDate": "2025-10-22T04:00:00.000Z",
      "fileSize": 1024000,
      "mimeType": "image/jpeg",
      "createdAt": "2025-10-22T04:00:00.000Z",
      "updatedAt": "2025-10-22T04:00:00.000Z"
    }
  ]
}
```

## 部署

```bash
npm install
npx wrangler deploy
```

## 环境变量

- `ALLOWED_ORIGINS`: 允许的 CORS 源，用逗号分隔