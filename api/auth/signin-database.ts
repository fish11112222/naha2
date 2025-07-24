import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';

function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

const signInSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณาระบุรหัสผ่าน"),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let requestBody = req.body;
    if (typeof req.body === 'string') {
      try {
        requestBody = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).json({ message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
      }
    }

    if (!requestBody || typeof requestBody !== 'object') {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
    }

    const validatedData = signInSchema.parse(requestBody);

    // Find user by email
    const result = await db.select().from(users).where(eq(users.email, validatedData.email));
    const user = result[0];

    if (!user || user.password !== validatedData.password) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    // Update last activity
    await db.update(users)
      .set({ 
        isOnline: true,
        lastActivity: new Date()
      })
      .where(eq(users.id, user.id));

    const { password, ...userWithoutPassword } = user;

    console.log(`User ${user.id} (${user.email}) signed in via database`);
    return res.status(200).json(userWithoutPassword);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "ข้อมูลไม่ถูกต้อง", 
        errors: error.errors 
      });
    }
    
    console.error('Signin database error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}