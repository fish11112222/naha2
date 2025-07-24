# แก้ไขปัญหา Vercel Deployment - FUNCTION_INVOCATION_FAILED

## ปัญหา
แชทแอปไทยของคุณขึ้น `FUNCTION_INVOCATION_FAILED` บน Vercel เพราะ API functions มีปัญหา

## การแก้ไข

### ขั้นที่ 1: ตรวจสอบไฟล์ที่อัปเดตแล้ว
ไฟล์ที่ผมแก้ไขให้แล้ว:
- `api/messages.ts` - เพิ่ม async/await และ CORS
- `api/users.ts` - เพิ่ม async/await และ CORS  
- `api/auth.ts` - เพิ่ม async/await และ CORS
- `api/chat/theme.ts` - เพิ่ม async/await และ CORS
- `api/package.json` - อัปเดต dependencies
- `vercel.json` - เพิ่ม functions config

### ขั้นที่ 2: Deploy ใหม่
1. **Commit ทุกไฟล์ที่แก้ไขแล้ว** ไป Git repo
2. **Redeploy บน Vercel** (หรือ push ไป GitHub จะ auto deploy)
3. **รอให้ build เสร็จ** (ประมาณ 1-2 นาที)

### ขั้นที่ 3: ทดสอบ API
หลัง deploy เสร็จ ทดสอบ URL เหล่านี้:

```
https://pani-seven.vercel.app/api/users
https://pani-seven.vercel.app/api/messages  
https://pani-seven.vercel.app/api/auth
https://pani-seven.vercel.app/api/chat/theme
```

**ควรได้ JSON response ไม่ใช่ FUNCTION_INVOCATION_FAILED**

### ขั้นที่ 4: ทดสอบการ Login
1. เข้า https://pani-seven.vercel.app/
2. สมัครสมาชิกหรือลองใช้ user เดิม:
   - Email: `admin@example.com`
   - Password: `password123`
3. ทดสอบส่งข้อความภาษาไทย

## สาเหตุของปัญหาเดิม
- API functions ไม่มี `async/await`
- CORS headers ตั้งผิด
- `vercel.json` ไม่ระบุ functions runtime
- package.json ขาด dependencies

## หากยังมีปัญหา
1. ลองลบ `.vercel` folder ใน project (ถ้ามี)
2. Redeploy อีกครั้ง
3. ตรวจสอบ Vercel logs ใน dashboard

**หลังจากทำตามขั้นตอนแล้ว API ควรทำงานปกติบน Vercel!