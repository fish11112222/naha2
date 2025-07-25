import type { VercelRequest, VercelResponse } from '@vercel/node';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  dateOfBirth: string | null;
  isOnline: boolean;
  lastActivity: string | null;
  createdAt: string;
}

// Global storage
const SHARED_USERS_KEY = 'VERCEL_SHARED_USERS_SIMPLE';
const DEFAULT_USERS: User[] = [
  {
    id: 1,
    username: "kuyyy",
    email: "kuy@gmail.com",
    firstName: "Kuy",
    lastName: "Kuy",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kuy",
    bio: "Hello world! 👋 ชื่อจริงของผมคือ กุย",
    location: "เชียงใหม่",
    website: "https://github.com/kuyyy",
    dateOfBirth: "1992-10-10",
    isOnline: true,
    lastActivity: new Date().toISOString(),
    createdAt: "2025-07-23T03:09:13.000Z"
  },
  {
    id: 2,
    username: "panida",
    email: "panida@gmail.com",
    firstName: "Panida",
    lastName: "ใสใจ",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=panida",
    bio: "รักการเขียนโปรแกรม และการสร้างแอปแชท",
    location: "กรุงเทพฯ",
    website: "https://github.com/panida",
    dateOfBirth: "1995-05-15",
    isOnline: true,
    lastActivity: new Date().toISOString(),
    createdAt: "2025-07-22T12:00:00.000Z"
  },
  {
    id: 3,
    username: "sirinat",
    email: "sirinat@gmail.com",
    firstName: "Kuyiig",
    lastName: "Frxg",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sirinat",
    bio: "ชอบเล่นเกม และพัฒนาแอปมือถือ",
    location: "ภูเก็ต",
    website: "https://sirinat.dev",
    dateOfBirth: "1993-08-22",
    isOnline: false,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: "2025-07-20T15:30:00.000Z"
  }
];

function getUsers(): User[] {
  if (!(global as any)[SHARED_USERS_KEY]) {
    (global as any)[SHARED_USERS_KEY] = [...DEFAULT_USERS];
  }
  return (global as any)[SHARED_USERS_KEY];
}

function enableCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { action } = req.query;
      
      if (action === 'count') {
        const users = getUsers();
        const activeCount = users.filter(user => {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const lastActivity = user.lastActivity ? new Date(user.lastActivity) : new Date(0);
          return lastActivity > fiveMinutesAgo;
        }).length;
        
        return res.status(200).json({ count: activeCount });
      }
      
      const users = getUsers();
      return res.status(200).json(users);
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    console.error('Users error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}