// Import the global messages from the main messages endpoint
import { NextApiRequest, NextApiResponse } from 'next';

// We'll need to access the same global storage
// For simplicity in this demo, let's use a basic approach
let globalMessages: any[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const messageId = parseInt(id as string);

  if (req.method === 'DELETE') {
    try {
      const { userId } = req.query;
      
      // Find message
      const messageIndex = globalMessages.findIndex(m => m.id === messageId);
      
      if (messageIndex === -1) {
        return res.status(404).json({ error: 'ไม่พบข้อความ' });
      }

      const message = globalMessages[messageIndex];
      
      // Check ownership
      if (message.userId !== parseInt(userId as string)) {
        return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบข้อความนี้' });
      }

      // Delete message
      globalMessages.splice(messageIndex, 1);
      
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อความ' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { content, userId } = req.body;
      
      const messageIndex = globalMessages.findIndex(m => m.id === messageId);
      
      if (messageIndex === -1) {
        return res.status(404).json({ error: 'ไม่พบข้อความ' });
      }

      const message = globalMessages[messageIndex];
      
      // Check ownership
      if (message.userId !== userId) {
        return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขข้อความนี้' });
      }

      // Update message
      globalMessages[messageIndex] = {
        ...message,
        content,
        updatedAt: new Date().toISOString()
      };
      
      return res.status(200).json(globalMessages[messageIndex]);
    } catch (error) {
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขข้อความ' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}