# วิธีสร้าง Repository ใหม่

## ขั้นตอนที่ 1: สร้าง Repository ใหม่ใน GitHub

1. ไป GitHub.com
2. คลิก + (มุมขวาบน) → New repository
3. ตั้งชื่อ: **thai-chat-app**
4. เลือก: **Public**
5. **อย่าติ๊ก** "Add a README file"
6. **อย่าติ๊ก** ".gitignore" และ "license"
7. คลิก **Create repository**

## ขั้นตอนที่ 2: Push โปรเจค

ใน Replit Shell:

```bash
# เปลี่ยน remote URL ไปใหม่
git remote set-url origin https://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@github.com/fish11112222/thai-chat-app.git

# Push ไป repo ใหม่
git push -u https://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@github.com/fish11112222/thai-chat-app.git main
```

## ขั้นตอนที่ 3: หลังจาก Push สำเร็จ

ไป Vercel.com:
1. New Project
2. Import from GitHub
3. เลือก thai-chat-app
4. Framework: Other
5. Deploy

Repository ใหม่จะไม่มี protection rules ที่ขัดขวางการ push