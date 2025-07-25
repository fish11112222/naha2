import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// For Vercel deployment, use fallback storage to avoid import issues
const USE_DATABASE = false;

// Type definitions
type Message = {
  id: number;
  content: string;
  username: string;
  userId: number;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
};

// Fallback storage
const SHARED_STORAGE_KEY = 'VERCEL_SHARED_MESSAGES_ACTIONS';
const DEFAULT_MESSAGES: Message[] = [
  {
    id: 1,
    content: "สวัสดีครับ ยินดีต้อนรับสู่ห้องแชท! 🎉",
    username: "Panida ใสใจ",
    userId: 2,
    createdAt: "2025-07-22T12:00:00.000Z",
    updatedAt: null,
    attachmentUrl: null,
    attachmentType: null,
    attachmentName: null
  },
  {
    id: 2,
    content: "หวัดดีครับ ขอบคุณสำหรับการต้อนรับนะครับ 😊",
    username: "Kuy Kuy",
    userId: 1,
    createdAt: "2025-07-22T12:05:00.000Z",
    updatedAt: null,
    attachmentUrl: null,
    attachmentType: null,
    attachmentName: null
  },
  {
    id: 3,
    content: "แอปแชทนี้ทำได้ดีมากเลย รองรับภาษาไทยได้เต็มที่ 👍",
    username: "แอดมิน ระบบ",
    userId: 4,
    createdAt: "2025-07-22T12:10:00.000Z",
    updatedAt: null,
    attachmentUrl: null,
    attachmentType: null,
    attachmentName: null
  }
];

function getMessages(): Message[] {
  if (!(global as any)[SHARED_STORAGE_KEY]) {
    (global as any)[SHARED_STORAGE_KEY] = [...DEFAULT_MESSAGES];
  }
  return (global as any)[SHARED_STORAGE_KEY];
}

function saveMessages(messageList: Message[]): void {
  (global as any)[SHARED_STORAGE_KEY] = messageList;
}

function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

const updateMessageSchema = z.object({
  content: z.string().min(1, "ข้อความไม่สามารถว่างได้").max(500, "ข้อความยาวเกินไป"),
  userId: z.number().min(1, "รหัสผู้ใช้ไม่ถูกต้อง"),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id, action, userId } = req.query;
  const messageId = parseInt(id as string);
  const userIdNum = parseInt(userId as string);

  if (!messageId || !action) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
  }

  try {
    if (action === 'update' && req.method === 'PUT') {
      // Parse body if it's a string
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return res.status(400).json({ message: 'ข้อมูล JSON ไม่ถูกต้อง' });
        }
      }

      const validation = updateMessageSchema.safeParse(body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: validation.error.errors 
        });
      }

      if (USE_DATABASE && db && messages && eq) {
        const result = await db.select().from(messages).where(eq(messages.id, messageId));
        const message = result[0];
        
        if (!message) {
          return res.status(404).json({ message: 'ไม่พบข้อความ' });
        }

        if (message.userId !== validation.data.userId) {
          return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขข้อความนี้' });
        }

        const updated = await db.update(messages)
          .set({ content: validation.data.content, updatedAt: new Date() })
          .where(eq(messages.id, messageId))
          .returning();

        return res.status(200).json(updated[0]);
      } else {
        const messageList = getMessages();
        const messageIndex = messageList.findIndex(m => m.id === messageId);
        
        if (messageIndex === -1) {
          return res.status(404).json({ message: 'ไม่พบข้อความ' });
        }

        if (messageList[messageIndex].userId !== validation.data.userId) {
          return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขข้อความนี้' });
        }

        messageList[messageIndex] = {
          ...messageList[messageIndex],
          content: validation.data.content,
          updatedAt: new Date().toISOString()
        };

        saveMessages(messageList);
        return res.status(200).json(messageList[messageIndex]);
      }
    }

    if (action === 'delete' && req.method === 'DELETE') {
      if (!userIdNum) {
        return res.status(400).json({ message: 'ระบุรหัสผู้ใช้' });
      }

      if (USE_DATABASE && db && messages && eq) {
        const result = await db.select().from(messages).where(eq(messages.id, messageId));
        const message = result[0];
        
        if (!message) {
          return res.status(404).json({ message: 'ไม่พบข้อความ' });
        }

        if (message.userId !== userIdNum) {
          return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบข้อความนี้' });
        }

        await db.delete(messages).where(eq(messages.id, messageId));
        return res.status(204).end();
      } else {
        const messageList = getMessages();
        const messageIndex = messageList.findIndex(m => m.id === messageId);
        
        if (messageIndex === -1) {
          return res.status(404).json({ message: 'ไม่พบข้อความ' });
        }

        if (messageList[messageIndex].userId !== userIdNum) {
          return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบข้อความนี้' });
        }

        messageList.splice(messageIndex, 1);
        saveMessages(messageList);
        return res.status(204).end();
      }
    }
    
    return res.status(405).json({ message: 'วิธีการเรียก API ไม่ถูกต้อง' });
    
  } catch (error) {
    console.error('Message action error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}