# แก้ไข Vercel Deployment Error

## ปัญหา: The 'functions' property cannot be used in conjunction with the 'builds' property

**สาเหตุ:** ใช้ทั้ง `functions` และ `builds` พร้อมกัน ซึ่ง Vercel ไม่อนุญาต

## ✅ วิธีแก้ไข - อัปเดต vercel.json:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "api/messages.ts",
      "use": "@vercel/node"
    },
    {
      "src": "api/users.ts",
      "use": "@vercel/node"
    },
    {
      "src": "api/auth.ts",
      "use": "@vercel/node"
    },
    {
      "src": "api/chat/theme.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/messages",
      "dest": "/api/messages"
    },
    {
      "src": "/api/users",
      "dest": "/api/users"
    },
    {
      "src": "/api/auth",
      "dest": "/api/auth"
    },
    {
      "src": "/api/chat/theme",
      "dest": "/api/chat/theme"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## 🔧 ขั้นตอนต่อไป:

1. **Copy vercel.json ข้างบน**
2. **ไป GitHub repository** → แก้ไขไฟล์ `vercel.json`  
3. **Paste เนื้อหาใหม่** → Commit changes
4. **Vercel จะ redeploy อัตโนมัติ**

## 🎯 การเปลี่ยนแปลง:

- ✅ ลบ `functions` property ออก
- ✅ ย้าย API functions ไปใน `builds` แทน
- ✅ ใช้ `@vercel/node` standard runtime
- ✅ เก็บ routes configuration เดิม

หลังจากอัปเดตแล้วแอปจะทำงานปกติ!