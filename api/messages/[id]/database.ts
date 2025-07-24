import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db, messages } from '../../db';
import { eq } from 'drizzle-orm';

function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

const updateMessageSchema = z.object({
  content: z.string().min(1, "ข้อความไม่สามารถว่างได้").max(500, "ข้อความยาวเกินไป"),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id: idParam } = req.query;
  const messageId = parseInt(idParam as string);

  if (!messageId || isNaN(messageId)) {
    return res.status(400).json({ message: 'ID ข้อความไม่ถูกต้อง' });
  }

  try {
    if (req.method === 'GET') {
      const result = await db.select().from(messages).where(eq(messages.id, messageId));
      const message = result[0];
      
      if (!message) {
        return res.status(404).json({ message: 'ไม่พบข้อความ' });
      }
      
      return res.status(200).json(message);
    }

    if (req.method === 'PUT') {
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

      const validatedData = updateMessageSchema.parse(requestBody);
      const userId = requestBody.userId || parseInt(req.query.userId as string);

      if (!userId) {
        return res.status(400).json({ message: 'กรุณาระบุ ID ผู้ใช้' });
      }

      // Verify message exists and belongs to user
      const existingMessage = await db.select().from(messages).where(eq(messages.id, messageId));
      if (!existingMessage[0] || existingMessage[0].userId !== userId) {
        return res.status(404).json({ message: 'ไม่พบข้อความหรือคุณไม่มีสิทธิ์แก้ไข' });
      }

      const result = await db.update(messages)
        .set({ 
          content: validatedData.content,
          updatedAt: new Date()
        })
        .where(eq(messages.id, messageId))
        .returning();

      const updatedMessage = result[0];
      console.log(`Updated message ${messageId} in database`);
      return res.status(200).json(updatedMessage);
    }

    if (req.method === 'DELETE') {
      const userId = parseInt(req.query.userId as string);

      if (!userId) {
        return res.status(400).json({ message: 'กรุณาระบุ ID ผู้ใช้' });
      }

      // Verify message exists and belongs to user
      const existingMessage = await db.select().from(messages).where(eq(messages.id, messageId));
      if (!existingMessage[0] || existingMessage[0].userId !== userId) {
        console.log(`Delete failed: Message ${messageId} not found or not owned by user ${userId}`);
        return res.status(404).json({ message: 'ไม่พบข้อความหรือคุณไม่มีสิทธิ์ลบ' });
      }

      const result = await db.delete(messages).where(eq(messages.id, messageId)).returning();
      
      if (result.length > 0) {
        console.log(`Deleted message ${messageId} from database`);
        return res.status(204).end();
      } else {
        return res.status(404).json({ message: 'ไม่สามารถลบข้อความได้' });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "ข้อมูลไม่ถูกต้อง", 
        errors: error.errors 
      });
    }
    
    console.error('Message database error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}