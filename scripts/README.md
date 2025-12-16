# 🛠️ Scripts

Scripts สำหรับช่วยในการจัดการโปรเจค

## 📜 Active Scripts

### Icon Generation

**`generate-icons.sh`**
```bash
./scripts/generate-icons.sh
```
สร้าง PWA icons จาก favicon.svg (ต้องมี ImageMagick)

**`generate-icons.js`**
```bash
node scripts/generate-icons.js
```
สร้าง placeholder icons แบบ SVG

**`generate-icons-from-png.sh`**
```bash
./scripts/generate-icons-from-png.sh
```
สร้าง icons หลายขนาดจากไฟล์ PNG (ใช้ sips - macOS built-in)

**`update-icons.sh`**
```bash
./scripts/update-icons.sh
```
อัพเดท icons ทั้งหมดจากโฟลเดอร์ favicon-for-public

---

## 📦 Legacy Scripts

Scripts เก่าที่เก็บไว้เพื่ออ้างอิง อยู่ใน `legacy/` folder:

- `add-white-background.js` - เพิ่ม white background ให้ icons (ไม่ได้ใช้แล้ว)
- `copy-and-resize-icons.js` - Copy และ resize icons (ไม่ได้ใช้แล้ว)

---

## 💡 Usage Tips

### ต้องการสร้าง icons ใหม่?

1. **มี ImageMagick:**
   ```bash
   ./scripts/generate-icons.sh
   ```

2. **ไม่มี ImageMagick (ใช้ sips - macOS):**
   ```bash
   ./scripts/generate-icons-from-png.sh
   ```

3. **อัพเดทจากโฟลเดอร์ favicon:**
   ```bash
   ./scripts/update-icons.sh
   ```

### ติดตั้ง ImageMagick:
```bash
brew install imagemagick
```

---

## 📚 Related Documentation

- [PWA Guide](../docs/PWA_GUIDE.md)
- [Icon Update Instructions](../docs/ICON_UPDATE_INSTRUCTIONS.md)

