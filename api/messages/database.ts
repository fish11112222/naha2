import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db, messages } from '../db';
import { desc } from 'drizzle-orm';

function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

const messageSchema = z.object({
  content: z.string().min(0, "").optional().default(""),
  username: z.string().min(1),
  userId: z.number(),
  attachmentUrl: z.string().optional(),
  attachmentType: z.enum(['image', 'file', 'gif']).optional(),
  attachmentName: z.string().optional(),
}).refine((data) => {
  return (data.content && data.content.trim().length > 0) || (data.attachmentUrl && data.attachmentType);
}, {
  message: "กรุณาระบุข้อความหรือแนบไฟล์",
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const limit = parseInt(req.query.limit as string) || 50;
      const allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(limit);
      const sortedMessages = allMessages.reverse();
      console.log(`Retrieved ${sortedMessages.length} messages from database`);
      return res.status(200).json(sortedMessages);
    }
    
    if (req.method === 'POST') {
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
      
      const validatedData = messageSchema.parse(requestBody);
      
      const result = await db.insert(messages).values({
        content: validatedData.content || "",
        username: validatedData.username,
        userId: validatedData.userId,
        attachmentUrl: validatedData.attachmentUrl || null,
        attachmentType: validatedData.attachmentType || null,
        attachmentName: validatedData.attachmentName || null,
      }).returning();
      
      const newMessage = result[0];
      console.log(`Created message ${newMessage.id} in database`);
      return res.status(201).json(newMessage);
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "ข้อมูลไม่ถูกต้อง", 
        errors: error.errors 
      });
    }
    
    console.error('Messages database error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}