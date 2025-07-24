# วิธีอื่นถ้า Git ยังใช้ไม่ได้

## วิธี 1: ใช้ GitHub Web Interface

1. ไป GitHub.com สร้าง repository ใหม่ชื่อ "thai-chat-app"
2. เลือก "uploading an existing file"
3. Drag & Drop ไฟล์เหล่านี้:
   - api/ (โฟลเดอร์ทั้งหมด)
   - client/ (โฟลเดอร์ทั้งหมด) 
   - shared/ (โฟลเดอร์ทั้งหมด)
   - vercel.json
   - README.md
   - replit.md

## วิธี 2: ดาวน์โหลดโปรเจค

1. ใน Replit: Three dots menu → Download as zip
2. Extract ไฟล์
3. อัปโหลดไป GitHub repository ใหม่

## หลังจากมีไฟล์ใน GitHub แล้ว:

1. ไป Vercel.com
2. New Project → เลือก repository 
3. Deploy

ไฟล์สำคัญที่ต้องมีใน GitHub:
✅ vercel.json
✅ api/ (folder มี .ts files)
✅ client/ (folder มี React code)
✅ README.md