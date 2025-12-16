# 401 Unauthorized 错误调试指南

## 问题描述

History Worker 返回 401 Unauthorized 错误，导致 Gallery 页面无法加载图片历史记录。

## 错误日志

```
GET https://history-worker-v2-prod.haoweiw370.workers.dev/api/history 401 (Unauthorized)
```

## 可能的原因

### 1. Access Token 未正确传递

**检查步骤**:

1. 打开浏览器开发者工具（F12）
2. 进入 Console 标签
3. 查找以下日志：

```
Gallery: Checking auth data: Found
Gallery: Parsed auth: { hasUser: true, hasToken: true, userId: ..., username: ... }
Gallery: Authentication successful, token set
```

4. 进入 Application 标签 → Local Storage
5. 查看 `auth` 键的值
6. 确认包含：
   ```json
   {
     "user": { "id": ..., "login": "..." },
     "accessToken": "gho_...",
     "timestamp": ...
   }
   ```

### 2. Token 已过期

GitHub access token 默认不会过期，除非：
- 你手动撤销了授权
- GitHub检测到安全问题

**解决方案**: 重新登录

1. 清除 localStorage: `localStorage.removeItem('auth')`
2. 刷新页面
3. 重新通过 GitHub OAuth 登录

### 3. Token 权限不足

**检查Token权限**:

```javascript
// 在浏览器控制台执行
const auth = JSON.parse(localStorage.getItem('auth'));
fetch('https://api.github.com/user', {
  headers: {
    'Authorization': `Bearer ${auth.accessToken}`,
    'User-Agent': 'PicoPics'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

如果返回 401，说明 token 无效。

### 4. CORS 问题

检查网络请求：

1. F12 → Network 标签
2. 找到 `/api/history` 请求
3. 查看 Request Headers
4. 确认包含：
   ```
   Authorization: Bearer gho_...
   ```

如果没有 Authorization header，说明前端代码有问题。

### 5. Worker 端验证逻辑问题

**测试 Worker**:

```bash
# 使用你的真实 token 测试
TOKEN="你的_GitHub_token"

curl -H "Authorization: Bearer $TOKEN" \
  https://history-worker-v2-prod.haoweiw370.workers.dev/api/history
```

预期结果：
- ✅ 200 OK + 图片列表数据
- ❌ 401 → Worker 验证逻辑有问题
- ❌ 403 → Token 无效

## 调试工具

### 1. 在线 Token 验证

在浏览器控制台执行：

```javascript
// 复制这段代码到控制台
(async () => {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  
  console.log('=== Token 验证 ===');
  console.log('Access Token:', auth.accessToken ? auth.accessToken.substring(0, 20) + '...' : '不存在');
  
  if (!auth.accessToken) {
    console.error('❌ 未找到 Access Token');
    return;
  }
  
  console.log('测试 GitHub API...');
  const githubRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'User-Agent': 'PicoPics'
    }
  });
  
  console.log('GitHub API 状态:', githubRes.status);
  if (githubRes.ok) {
    const user = await githubRes.json();
    console.log('✅ GitHub Token 有效');
    console.log('用户:', user.login, `(ID: ${user.id})`);
  } else {
    console.error('❌ GitHub Token 无效');
  }
  
  console.log('\\n测试 History Worker...');
  const historyRes = await fetch(
    'https://history-worker-v2-prod.haoweiw370.workers.dev/api/history',
    {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('History Worker 状态:', historyRes.status);
  const historyData = await historyRes.json();
  console.log('History Worker 响应:', historyData);
  
  if (historyRes.ok) {
    console.log('✅ History Worker 正常');
  } else {
    console.error('❌ History Worker 返回错误:', historyData);
  }
})();
```

### 2. Network 日志分析

```javascript
// 监控所有 API 请求
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  console.log('📡 Fetch:', url);
  console.log('Headers:', options?.headers);
  return originalFetch.apply(this, args);
};
```

## 常见解决方案

### 方案 1: 清除并重新登录

```javascript
// 在浏览器控制台执行
localStorage.clear();
location.reload();
```

然后重新登录。

### 方案 2: 手动设置 Token

如果你有有效的 GitHub Personal Access Token:

```javascript
// 替换为你的 GitHub user 信息和 token
localStorage.setItem('auth', JSON.stringify({
  user: {
    id: 你的用户ID,
    login: "你的用户名",
    email: "你的邮箱",
    avatar_url: "头像URL"
  },
  accessToken: "gho_你的token",
  timestamp: Date.now()
}));

location.reload();
```

### 方案 3: 检查 Worker Secrets

确保 History Worker 配置了正确的环境变量：

```bash
cd workers
npx wrangler secret list --config history-wrangler.toml
```

## 预防措施

### 1. Token 过期检测

在 `lib/api.ts` 中添加：

```typescript
if (!response.ok && response.status === 401) {
  // Token 可能已过期
  localStorage.removeItem('auth');
  window.location.href = '/';
  throw new Error('认证失败，请重新登录');
}
```

### 2. 自动重试机制

在 React Query 配置中：

```typescript
retry: (failureCount, error) => {
  if (error.status === 401) return false; // 不重试认证错误
  return failureCount < 3;
}
```

### 3. Token 刷新

GitHub OAuth Apps 不支持 refresh token，需要重新授权。

## 快速诊断清单

- [ ] localStorage 中是否有 `auth` 数据？
- [ ] `auth.accessToken` 是否存在？
- [ ] Token 能否访问 GitHub API？
- [ ] Network 请求是否包含 Authorization header？
- [ ] History Worker 返回什么错误信息？
- [ ] 其他用户是否有相同问题？
- [ ] 是否最近修改了 Worker 代码？

## 联系支持

如果以上方法都无法解决，请提供：

1. 浏览器控制台完整日志
2. Network 标签中的请求详情
3. localStorage 的 auth 数据（隐藏 token）
4. 是否能访问 GitHub API
5. 是否最近撤销过 GitHub 授权
