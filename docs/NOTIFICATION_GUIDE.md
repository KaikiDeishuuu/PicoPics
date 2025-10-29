# 通知系统使用指南

## 概述

PicoPics V2 实现了一个完整的通知系统，用于向用户展示各种操作反馈信息。

## 特性

-  统一的通知接口
-  预定义的通知场景
-  自动错误处理
-  自定义显示时长
-  优雅的动画效果

## 使用方式

### 1. 基础使用

```tsx
import { useNotifications } from "@/lib/hooks/use-notifications";

function MyComponent() {
  const { success, error, warning, info } = useNotifications();

  const handleClick = () => {
    success("操作成功", "您的请求已成功处理");
  };

  return <button onClick={handleClick}>点击我</button>;
}
```

### 2. 使用预定义通知

```tsx
import { useNotifications } from "@/lib/hooks/use-notifications";

function UploadComponent() {
  const { notify } = useNotifications();

  const handleUpload = async (file: File) => {
    try {
      // 上传文件
      await uploadFile(file);

      // 成功通知
      notify.upload.success(file.name);
    } catch (error) {
      // 错误通知
      notify.upload.error(error.message);
    }
  };

  return (
    <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
  );
}
```

### 3. 自动错误处理

当使用 `useUploadImage` 等已集成的 hooks 时，错误会自动被捕获并显示相应的通知：

```tsx
import { useUploadImage } from "@/lib/hooks/use-queries";

function UploadPage() {
  const uploadMutation = useUploadImage();

  // 上传失败时会自动显示错误通知
  // 上传成功时会自动显示成功通知
  const handleUpload = (file: File) => {
    uploadMutation.mutate({ file });
  };

  return <button onClick={() => handleUpload(file)}>上传</button>;
}
```

## 通知场景

### 上传相关

- `notify.upload.success(filename)` - 上传成功
- `notify.upload.error(reason)` - 上传失败
- `notify.upload.oversized(maxSize)` - 文件过大
- `notify.upload.invalidType()` - 不支持的文件类型
- `notify.upload.quotaExceeded()` - 配额用完
- `notify.upload.frequencyLimit(waitTime)` - 频率过高
- `notify.upload.contentModerated(reason)` - 内容审核未通过

### IP 封禁相关

- `notify.ipBan.banned(reason, duration)` - IP 被封禁
- `notify.ipBan.unbanned()` - IP 已解封
- `notify.ipBan.blockWarning(attempts)` - 封禁警告

### 认证相关

- `notify.auth.loginRequired()` - 需要登录
- `notify.auth.loginSuccess()` - 登录成功
- `notify.auth.logoutSuccess()` - 登出成功
- `notify.auth.tokenExpired()` - Token 过期

### 管理员相关

- `notify.admin.accessDenied()` - 无权限访问
- `notify.admin.tokenInvalid()` - 令牌无效
- `notify.admin.banSuccess(ip)` - 封禁成功
- `notify.admin.unbanSuccess(ip)` - 解封成功

### 图片相关

- `notify.image.deleteSuccess()` - 删除成功
- `notify.image.deleteError()` - 删除失败
- `notify.image.copySuccess()` - 复制成功
- `notify.image.loadError()` - 加载失败

### 网络相关

- `notify.network.offline()` - 网络离线
- `notify.network.slowConnection()` - 网络较慢
- `notify.network.timeout()` - 请求超时

### 系统相关

- `notify.system.maintenance()` - 系统维护
- `notify.system.rateLimit(retryAfter)` - 请求过于频繁
- `notify.system.serverError()` - 服务器错误

### 配额相关

- `notify.quota.approaching(percentage)` - 配额即将用尽
- `notify.quota.exceeded(resetTime)` - 配额已用完
- `notify.quota.reset()` - 配额已重置

## 通知类型

- `success` - 成功操作（绿色）
- `error` - 错误信息（红色）
- `warning` - 警告信息（橙色）
- `info` - 普通信息（蓝色）

## 自定义通知

```tsx
import { NotificationService } from "@/lib/notifications";

// 显示自定义通知
NotificationService.show({
  type: "success",
  title: "自定义标题",
  description: "自定义描述",
  duration: 5000, // 显示5秒
});

// 或使用快捷方法
NotificationService.success("成功", "操作已完成");
NotificationService.error("失败", "操作失败");
NotificationService.warning("警告", "请注意");
NotificationService.info("提示", "这是一条信息");
```

## 自动错误映射

系统会自动检测以下错误并显示相应的通知：

- `QUOTA_EXCEEDED` → 配额用完通知
- `RATE_LIMIT` → 频率限制通知
- `FILE_TOO_LARGE` → 文件过大通知
- `INVALID_FILE_TYPE` → 文件类型错误通知
- `IP_BLOCKED` → IP 封禁通知
- `CONTENT_BLOCKED` → 内容审核通知

## 最佳实践

1. **及时反馈**: 所有用户操作都应该有即时的通知反馈
2. **清晰明了**: 通知内容要简洁明了，避免技术术语
3. **合理时长**: 重要通知显示时间稍长，普通通知较短
4. **错误引导**: 错误通知要提供解决方法或建议
5. **统一风格**: 使用预定义通知保持界面风格一致

## 示例：完整的上传流程

```tsx
import { useUploadImage } from "@/lib/hooks/use-queries";
import { useNotifications } from "@/lib/hooks/use-notifications";

function UploadPage() {
  const { notify } = useNotifications();
  const uploadMutation = useUploadImage();

  const handleFileSelect = (file: File) => {
    // 检查文件大小
    if (file.size > 10 * 1024 * 1024) {
      notify.upload.oversized("10MB");
      return;
    }

    // 检查文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      notify.upload.invalidType();
      return;
    }

    // 上传文件（自动显示成功/失败通知）
    uploadMutation.mutate({ file });
  };

  return (
    <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
  );
}
```

## 技术实现

### 组件层次

```
ToastManager (容器)
  └─ Toast (单个通知)
      ├─ Icon (图标)
      ├─ Content (内容)
      └─ CloseButton (关闭按钮)
```

### 数据流

```
API Error → handleApiError() → Notification → NotificationService → useToast → Toast UI
```

## 未来扩展

- [ ] 支持通知分组
- [ ] 支持通知持久化
- [ ] 支持声音提醒
- [ ] 支持浏览器通知
- [ ] 支持通知历史记录
