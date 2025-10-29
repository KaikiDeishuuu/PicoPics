# Agent 集成配置指南

本文档说明如何将 Nezha Agent 集成到 PicoPics 系统监控中，实现真正的实时系统监控。

## 概述

PicoPics 现在支持通过 Nezha Agent 获取真实的系统监控数据，包括：

- CPU、内存、磁盘使用率
- 系统负载、进程数、连接数
- 温度监控、GPU 使用率
- 网络流量统计
- 系统信息（平台、架构、版本等）

## 配置步骤

### 1. 启动 Agent 接收器

首先需要启动 Nezha Agent 接收器服务：

```bash
cd /home/PicoPicsFullStack/agent

# 构建接收器
go build -o grpc_receiver ./cmd/grpc_receiver

# 启动接收器（无安全配置，仅用于测试）
./grpc_receiver \
  -grpc-port=50051 \
  -http-port=8080 \
  -db-path="./nezha_receiver.db"

# 或者使用安全配置
./grpc_receiver \
  -grpc-port=50051 \
  -http-port=8080 \
  -api-key="your-secure-api-key-here" \
  -ip-whitelist="127.0.0.1,192.168.1.0/24" \
  -tls-cert="server.crt" \
  -tls-key="server.key" \
  -db-path="./nezha_receiver.db"
```

### 2. 配置前端环境变量

在 PicoPics 项目中创建或更新 `.env.local` 文件：

```bash
# Agent API 配置
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8080
NEXT_PUBLIC_AGENT_API_KEY=your-secure-api-key-here
```

### 3. 启动 Nezha Agent

在需要监控的服务器上启动 Nezha Agent：

```bash
# 下载并配置 Nezha Agent
# 编辑配置文件 config.yml
server: "your-server-ip:50051"
client_secret: "your-secret"
tls: false  # 如果启用了TLS则设为true

# 启动 Agent
./nezha-agent
```

## 功能特性

### 实时监控数据

- **系统资源**: CPU、内存、磁盘使用率（实时百分比）
- **系统负载**: 1 分钟、5 分钟、15 分钟负载平均值
- **进程信息**: 进程数、TCP/UDP 连接数
- **温度监控**: CPU、GPU 等硬件温度
- **GPU 使用率**: 多 GPU 使用情况
- **网络流量**: 实时上传/下载速度

### 系统信息

- **平台信息**: 操作系统类型和版本
- **硬件信息**: CPU 型号、GPU 型号、架构
- **虚拟化**: 虚拟化类型检测
- **存储信息**: 总内存、总磁盘、交换空间

### 自动回退机制

如果 Agent 连接失败，系统会自动回退到原有的硬编码数据，确保监控面板始终可用。

## API 端点

Agent 接收器提供以下 REST API 端点：

- `GET /api/v1/health` - 健康检查
- `GET /api/v1/hosts` - 获取主机信息
- `GET /api/v1/hosts/{id}` - 获取特定主机信息
- `GET /api/v1/states` - 获取系统状态
- `GET /api/v1/states/{id}` - 获取特定系统状态
- `GET /api/v1/geoips` - 获取地理位置信息

## 安全配置

### API 密钥认证

```bash
# 启动时设置 API 密钥
./grpc_receiver -api-key="your-secure-api-key-here"
```

### IP 白名单

```bash
# 限制允许连接的 IP 地址
./grpc_receiver -ip-whitelist="127.0.0.1,192.168.1.0/24"
```

### TLS 加密

```bash
# 生成自签名证书（仅用于测试）
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes -subj "/CN=localhost"

# 启动时启用 TLS
./grpc_receiver -enable-tls -tls-cert="server.crt" -tls-key="server.key"
```

## 故障排除

### 常见问题

1. **Agent 连接失败**

   - 检查 Agent 接收器是否正在运行
   - 验证 API URL 和端口配置
   - 检查网络连接和防火墙设置

2. **API 认证失败**

   - 确认 API 密钥配置正确
   - 检查环境变量是否正确加载

3. **数据不更新**
   - 确认 Nezha Agent 正在运行并连接到接收器
   - 检查 Agent 配置中的服务器地址

### 调试模式

在浏览器开发者工具中查看控制台输出，系统会显示详细的连接状态和错误信息。

## 开发说明

### 文件结构

- `lib/agent-client.ts` - Agent API 客户端
- `components/ui/responsive-system-monitor.tsx` - 响应式系统监控组件
- `components/ui/system-monitor-modern.tsx` - 现代化桌面版监控组件
- `components/ui/agent-monitor-mobile.tsx` - 移动端专用监控组件
- `docs/AGENT_INTEGRATION.md` - 本文档

### 扩展功能

可以通过修改 `agent-client.ts` 添加更多 API 端点，或在 `system-monitor-modern.tsx` 中添加新的监控指标显示。

## 生产环境建议

1. 使用强密码作为 API 密钥
2. 启用 TLS 加密
3. 配置适当的 IP 白名单
4. 定期备份数据库文件
5. 监控 Agent 接收器的资源使用情况
