# PWA Icons

ต้องการไฟล์ไอคอนต่อไปนี้เพื่อให้ PWA ทำงานได้อย่างสมบูรณ์:

## Required Icons:
- icon-72x72.png (72x72px)
- icon-96x96.png (96x96px)
- icon-128x128.png (128x128px)
- icon-144x144.png (144x144px)
- icon-152x152.png (152x152px) - สำหรับ iOS
- icon-192x192.png (192x192px)
- icon-384x384.png (384x384px)
- icon-512x512.png (512x512px)

## วิธีสร้างไอคอน:

### ตัวเลือกที่ 1: ใช้เครื่องมือออนไลน์ (แนะนำ)
1. ไปที่ https://realfavicongenerator.net หรือ https://www.pwabuilder.com/imageGenerator
2. อัพโหลดโลโก้ของบริษัท (ขนาดอย่างน้อย 512x512px)
3. Download ไฟล์ไอคอนทั้งหมด
4. นำมาใส่ในโฟลเดอร์นี้

### ตัวเลือกที่ 2: ใช้ ImageMagick (CLI)
```bash
# ติดตั้ง ImageMagick ก่อน
brew install imagemagick

# สร้างไอคอนจากไฟล์ต้นฉบับ (logo.png)
convert logo.png -resize 72x72 icon-72x72.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 512x512 icon-512x512.png
```

### ตัวเลือกที่ 3: ใช้ Photoshop/Figma/Canva
1. สร้างไฟล์ขนาดต่างๆ ตามที่ระบุด้านบน
2. Export เป็น PNG
3. บันทึกในโฟลเดอร์นี้

## คำแนะนำสำหรับไอคอน:
- ใช้พื้นหลังสีทึบ (ไม่ใช่โปร่งใส) สำหรับ iOS
- ขอบเขตปลอดภัย: ควรมี padding ประมาณ 10% รอบๆ โลโก้
- ใช้สีที่ตรงกับ theme_color ใน manifest.json (#3b82f6)
- ไอคอนควรชัดเจนและอ่านง่ายในขนาดเล็ก

