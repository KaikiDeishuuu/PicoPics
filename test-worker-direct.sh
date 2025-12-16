#!/bin/bash

echo "======================================"
echo "测试 1: Health Check"
echo "======================================"
curl -s https://api.hiaplha.xyz/health | jq
echo ""

echo "======================================"
echo "测试 2: Quota API (无 token - 匿名用户)"
echo "======================================"
curl -s "https://api.hiaplha.xyz/api/quota" | jq
echo ""

echo "======================================"
echo "测试 3: 创建测试图片"
echo "======================================"
# 创建一个简单的 1x1 像素 PNG
printf '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0a\x49\x44\x41\x54\x78\x9c\x63\x00\x01\x00\x00\x05\x00\x01\x0d\x0a\x2d\xb4\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > /tmp/test.png
ls -lh /tmp/test.png
echo "Test image created"
echo ""

echo "======================================"
echo "测试 4: 上传图片 (无认证)"
echo "======================================"
curl -v -X POST https://api.hiaplha.xyz/upload \
  -F "image=@/tmp/test.png" \
  2>&1 | tee /tmp/upload-test-output.txt

echo ""
echo "======================================"
echo "查看响应 JSON"
echo "======================================"
grep -A 20 "< HTTP" /tmp/upload-test-output.txt | tail -1 | jq 2>/dev/null || echo "No valid JSON response"

echo ""
echo "测试完成"
