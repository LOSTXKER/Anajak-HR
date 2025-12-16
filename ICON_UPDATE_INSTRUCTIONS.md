# 🎨 คำแนะนำการอัพเดทไอคอน PWA

ไอคอนของคุณพร้อมแล้ว! ให้รันคำสั่งด้านล่างใน Terminal เพื่ออัพเดท

## วิธีที่ 1: รันคำสั่งเดียวเสร็จ (แนะนำ)

เปิด Terminal แล้ว copy คำสั่งนี้ทั้งหมด:

```bash
cd /Users/lostxker/Desktop/dev/Anajak-HR-main && \
cp /Users/lostxker/Downloads/favicon-for-public/web-app-manifest-192x192.png public/icons/icon-192x192.png && \
cp /Users/lostxker/Downloads/favicon-for-public/web-app-manifest-512x512.png public/icons/icon-512x512.png && \
sips -z 72 72 public/icons/icon-512x512.png --out public/icons/icon-72x72.png && \
sips -z 96 96 public/icons/icon-512x512.png --out public/icons/icon-96x96.png && \
sips -z 128 128 public/icons/icon-512x512.png --out public/icons/icon-128x128.png && \
sips -z 144 144 public/icons/icon-512x512.png --out public/icons/icon-144x144.png && \
sips -z 152 152 public/icons/icon-512x512.png --out public/icons/icon-152x152.png && \
sips -z 384 384 public/icons/icon-512x512.png --out public/icons/icon-384x384.png && \
rm -f public/icons/icon-*.svg && \
echo "✅ เสร็จสมบูรณ์!"
```

## วิธีที่ 2: รัน Script

```bash
cd /Users/lostxker/Desktop/dev/Anajak-HR-main
./update-icons.sh
```

## วิธีที่ 3: Copy ด้วย Finder (ง่ายที่สุด แต่ต้อง resize เอง)

1. เปิด Finder
2. ไปที่ `/Users/lostxker/Downloads/favicon-for-public/`
3. Copy ไฟล์ทั้ง 2 ไฟล์:
   - `web-app-manifest-192x192.png`
   - `web-app-manifest-512x512.png`
4. ไปที่ `/Users/lostxker/Desktop/dev/Anajak-HR-main/public/icons/`
5. Paste ไฟล์
6. เปลี่ยนชื่อเป็น:
   - `icon-192x192.png`
   - `icon-512x512.png`
7. รัน command นี้เพื่อสร้างขนาดอื่นๆ:

```bash
cd /Users/lostxker/Desktop/dev/Anajak-HR-main/public/icons && \
sips -z 72 72 icon-512x512.png --out icon-72x72.png && \
sips -z 96 96 icon-512x512.png --out icon-96x96.png && \
sips -z 128 128 icon-512x512.png --out icon-128x128.png && \
sips -z 144 144 icon-512x512.png --out icon-144x144.png && \
sips -z 152 152 icon-512x512.png --out icon-152x152.png && \
sips -z 384 384 icon-512x512.png --out icon-384x384.png && \
rm -f icon-*.svg
```

## หลังจากนั้น

อัพเดทไฟล์ configuration ให้ใช้ PNG แทน SVG:

```bash
cd /Users/lostxker/Desktop/dev/Anajak-HR-main

# อัพเดท manifest.json
sed -i '' 's/\.svg/.png/g' public/manifest.json
sed -i '' 's/"type": "image\/svg+xml"/"type": "image\/png"/g' public/manifest.json

# อัพเดท layout.tsx
sed -i '' 's/icon-152x152\.svg/icon-152x152.png/g' app/layout.tsx
sed -i '' 's/icon-192x192\.svg/icon-192x192.png/g' app/layout.tsx
sed -i '' 's/"image\/svg+xml"/"image\/png"/g' app/layout.tsx

echo "✅ Configuration updated!"
```

## ทดสอบ

```bash
npm run build
npm start
```

จากนั้นเปิด browser ไปที่ http://localhost:3000 และลอง "Add to Home Screen"

---

**หมายเหตุ:** ถ้า terminal commands ไม่ทำงาน ให้ใช้วิธีที่ 3 (Copy ด้วย Finder) แทนครับ

