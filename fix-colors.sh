#!/bin/bash

# 批量替换硬编码的颜色类名
files=(
  "app/admin/page.tsx"
  "app/upload/page.tsx"
  "app/gallery/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # 替换 text-white → text-foreground
    sed -i 's/text-white/ReplacementWHITETEXT/g' "$file"
    sed -i 's/ReplacementWHITETEXT/text-foreground/g' "$file"
    
    # 替换 text-white/XX → text-foreground/XX
    sed -i 's/text-white\/80/text-muted-foreground/g' "$file"
    sed -i 's/text-white\/70/text-muted-foreground/g' "$file"
    sed -i 's/text-white\/60/text-muted-foreground/g' "$file"
    sed -i 's/text-white\/50/text-muted-foreground/g' "$file"
    sed -i 's/text-white\/40/text-muted-foreground/g' "$file"
    sed -i 's/text-white\/30/text-muted-foreground/g' "$file"
    
    # 替换 bg-white → bg-card
    sed -i 's/bg-white/bg-card/g' "$file"
    
    # 替换 border-white → border-border
    sed -i 's/border-white\/20/border-border/g' "$file"
    sed -i 's/border-white\/10/border-border/g' "$file"
  fi
done

echo "✅ Color replacement complete!"
