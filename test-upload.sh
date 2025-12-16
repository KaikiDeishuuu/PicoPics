#!/bin/bash

# 创建一个测试图片
echo "Creating test image..."
convert -size 100x100 xc:blue /tmp/test-image.png

# 测试上传（需要有效的 GitHub token）
echo "Testing upload..."
curl -v -X POST https://api.hiaplha.xyz/upload \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN_HERE" \
  -F "image=@/tmp/test-image.png" \
  2>&1 | tee /tmp/upload-test.log

echo ""
echo "Test completed. Check /tmp/upload-test.log for details"
