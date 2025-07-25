// Mock users data for demo
const mockUsers = [
  {
    id: 1,
    email: 'kuy@gmail.com',
    firstName: 'กุ้ย',
    lastName: 'นาคา',
    username: 'kuy',
    bio: 'นักพัฒนาเว็บไซต์ที่หลงใหลในการสร้างแอปพลิเคชันแชท',
    location: 'กรุงเทพมหานคร, ประเทศไทย',
    website: 'https://github.com/kuy',
    avatar: null,
    isOnline: true,
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    email: 'admin@chat.com',
    firstName: 'แอดมิน',
    lastName: 'ระบบ',
    username: 'admin',
    bio: 'ผู้ดูแลระบบ Thai Chat App',
    location: 'ออนไลน์',
    website: 'https://chat.app',
    avatar: null,
    isOnline: true,
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json(mockUsers);
  }

  res.status(405).json({ error: 'Method not allowed' });
}