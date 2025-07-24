# คู่มือ Deploy Thai Chat App ไป Vercel

## วิธีที่ 1: ใช้ GitHub Desktop (แนะนำ)

1. **ดาวน์โหลด GitHub Desktop** จาก desktop.github.com
2. **Login ด้วย GitHub account**
3. **File → Clone repository → URL**
4. **ใส่:** https://github.com/fish11112222/isus.git
5. **เลือกโฟลเดอร์** ที่จะบันทึก
6. **Repository → Repository settings → Remote**
7. **เปลี่ยน URL เป็น:** https://github.com/fish11112222/thai-chat-app.git
8. **Copy ไฟล์จาก Replit** มาใส่ในโฟลเดอร์ที่ clone
9. **Commit changes → Push origin**

## วิธีที่ 2: ใช้ ZIP File

1. **สร้างไฟล์ ZIP** ของโปรเจคใน computer
2. **รวมไฟล์เหล่านี้:**
   ```
   api/
   ├── auth.ts
   ├── messages.ts
   ├── themes.ts
   └── users.ts
   
   client/
   ├── src/
   ├── package.json
   └── ...
   
   shared/
   └── schema.ts
   
   vercel.json
   README.md
   ```
3. **ไป GitHub.com → New repository "thai-chat-app"**
4. **Upload files → Choose ZIP → Extract → Commit**

## วิธีที่ 3: Copy & Paste แต่ละไฟล์

1. **สร้าง repo ใหม่ใน GitHub**
2. **สร้างไฟล์ทีละไฟล์:**
   - คลิก "Create new file"
   - Copy เนื้อหาจาก Replit มาวาง
   - ทำจนครบทุกไฟล์

## หลังจากมีไฟล์ใน GitHub แล้ว:

1. **ไป Vercel.com**
2. **Login ด้วย GitHub**
3. **New Project**
4. **Import thai-chat-app**
5. **Framework: Other**
6. **Deploy**

## ไฟล์สำคัญที่ต้องมี:

✅ vercel.json (สำหรับ routing)
✅ api/ folder (Vercel Functions)
✅ client/ folder (React frontend)
✅ shared/ folder (Types)

ลองวิธี 2 หรือ 3 ก่อนครับ จะง่ายที่สุด!