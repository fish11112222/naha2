// Global storage for demo
let globalMessages: any[] = [
  {
    id: 1,
    content: "สวัสดีครับ ยินดีต้อนรับสู่ Thai Chat!",
    username: "admin",
    userId: 2,
    attachmentUrl: null,
    attachmentType: null,
    attachmentName: null,
    createdAt: new Date().toISOString(),
    updatedAt: null
  },
  {
    id: 2,
    content: "สวัสดีค่ะ ดีใจที่ได้รู้จักทุกคน 😊",
    username: "kuy",
    userId: 1,
    attachmentUrl: null,
    attachmentType: null,
    attachmentName: null,
    createdAt: new Date().toISOString(),
    updatedAt: null
  }
];

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json(globalMessages);
  }

  if (req.method === 'POST') {
    try {
      const { content, username, userId, attachmentUrl, attachmentType, attachmentName } = req.body;
      
      const newMessage = {
        id: globalMessages.length + 1 + Math.floor(Math.random() * 1000),
        content: content || "",
        username,
        userId,
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        attachmentName: attachmentName || null,
        createdAt: new Date().toISOString(),
        updatedAt: null
      };

      globalMessages.push(newMessage);
      return res.status(201).json(newMessage);
    } catch (error) {
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่งข้อความ' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}