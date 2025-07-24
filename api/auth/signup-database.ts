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

const signUpSchema = z.object({
  username: z.string().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร").max(20, "ชื่อผู้ใช้ไม่สามารถเกิน 20 ตัวอักษร"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  firstName: z.string().min(1, "กรุณาระบุชื่อจริง").max(50, "ชื่อจริงยาวเกินไป"),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล").max(50, "นามสกุลยาวเกินไป"),
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

    const validatedData = signUpSchema.parse(requestBody);

    // Check if email already exists
    const existingEmail = await db.select().from(users).where(eq(users.email, validatedData.email));
    if (existingEmail.length > 0) {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
    }

    // Check if username already exists
    const existingUsername = await db.select().from(users).where(eq(users.username, validatedData.username));
    if (existingUsername.length > 0) {
      return res.status(409).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
    }

    // Create new user
    const result = await db.insert(users).values({
      username: validatedData.username,
      email: validatedData.email,
      password: validatedData.password,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      isOnline: true,
      lastActivity: new Date(),
    }).returning();

    const newUser = result[0];
    const { password, ...userWithoutPassword } = newUser;

    console.log(`Created user ${newUser.id} (${newUser.email}) in database`);
    return res.status(201).json(userWithoutPassword);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "ข้อมูลไม่ถูกต้อง", 
        errors: error.errors 
      });
    }
    
    console.error('Signup database error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}