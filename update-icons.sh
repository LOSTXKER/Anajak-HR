#!/bin/bash

echo "🎨 กำลังอัพเดทไอคอน PWA..."
echo ""

# Source and destination
SOURCE_DIR="/Users/lostxker/Downloads/favicon-for-public"
DEST_DIR="/Users/lostxker/Desktop/dev/Anajak-HR-main/public/icons"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ ไม่พบโฟลเดอร์: $SOURCE_DIR"
    exit 1
fi

# Create destination directory
mkdir -p "$DEST_DIR"

# Copy the two main files
echo "📋 กำลัง copy ไฟล์..."
cp "$SOURCE_DIR/web-app-manifest-192x192.png" "$DEST_DIR/icon-192x192.png"
cp "$SOURCE_DIR/web-app-manifest-512x512.png" "$DEST_DIR/icon-512x512.png"

echo "✅ Copy สำเร็จ: icon-192x192.png"
echo "✅ Copy สำเร็จ: icon-512x512.png"

# Generate other sizes using sips (macOS)
echo ""
echo "📐 กำลังสร้างไอคอนขนาดอื่นๆ..."

for size in 72 96 128 144 152 384; do
    sips -z $size $size "$DEST_DIR/icon-512x512.png" --out "$DEST_DIR/icon-${size}x${size}.png" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ สร้างสำเร็จ: icon-${size}x${size}.png"
    fi
done

# Remove old SVG files
echo ""
echo "🗑️  ลบไฟล์ SVG เก่า..."
rm -f "$DEST_DIR"/icon-*.svg 2>/dev/null
echo "✅ ลบ SVG files เรียบร้อย"

# Update manifest.json to use PNG instead of SVG
echo ""
echo "📝 อัพเดท manifest.json..."
MANIFEST="/Users/lostxker/Desktop/dev/Anajak-HR-main/public/manifest.json"
if [ -f "$MANIFEST" ]; then
    sed -i '' 's/\.svg/\.png/g' "$MANIFEST"
    sed -i '' 's/"type": "image\/svg+xml"/"type": "image\/png"/g' "$MANIFEST"
    echo "✅ อัพเดท manifest.json เรียบร้อย"
fi

echo ""
echo "✨ เสร็จสมบูรณ์! ไอคอนทั้งหมดถูกอัพเดทแล้ว"
echo ""
echo "📁 ไฟล์ที่สร้าง:"
ls -lh "$DEST_DIR"/icon-*.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "🚀 ขั้นตอนต่อไป:"
echo "  1. ตรวจสอบไอคอนใน public/icons/"
echo "  2. รัน: npm run build"
echo "  3. รัน: npm start"
echo "  4. ทดสอบใน browser"
echo ""

