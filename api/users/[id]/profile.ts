import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

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

// Profile update schema
const updateProfileSchema = z.object({
  firstName: z.string().min(1, "ชื่อจริงไม่สามารถว่างได้").max(50, "ชื่อจริงยาวเกินไป").optional(),
  lastName: z.string().min(1, "นามสกุลไม่สามารถว่างได้").max(50, "นามสกุลยาวเกินไป").optional(),
  bio: z.string().max(500, "ประวัติส่วนตัวยาวเกินไป").optional(),
  location: z.string().max(100, "ที่อยู่ยาวเกินไป").optional(),
  website: z.string().url("ลิงก์เว็บไซต์ไม่ถูกต้อง").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  avatar: z.string().optional(),
});

// Fallback storage
const SHARED_USERS_KEY = 'VERCEL_SHARED_USERS_PROFILE';
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
    firstName: "Sirinat",
    lastName: "Chanmali",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sirinat",
    bio: "ชอบเล่นเกม และพัฒนาแอปมือถือ",
    location: "ภูเก็ต", 
    website: "https://sirinat.dev",
    dateOfBirth: "1993-08-22",
    isOnline: false,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: "2025-07-20T15:30:00.000Z"
  },
  {
    id: 4,
    username: "admin",
    email: "admin@chat.com",
    firstName: "แอดมิน",
    lastName: "ระบบ",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
    bio: "ผู้ดูแลระบบแชท และพัฒนาฟีเจอร์ใหม่ๆ",
    location: "ทั่วประเทศไทย",
    website: "https://chat.example.com",
    dateOfBirth: "1990-01-01",
    isOnline: true,
    lastActivity: new Date().toISOString(),
    createdAt: "2025-07-15T08:00:00.000Z"
  }
];

function getUsers(): User[] {
  if (!(global as any)[SHARED_USERS_KEY]) {
    (global as any)[SHARED_USERS_KEY] = [...DEFAULT_USERS];
  }
  return (global as any)[SHARED_USERS_KEY];
}

function setUsers(users: User[]): void {
  (global as any)[SHARED_USERS_KEY] = users;
}

function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  const userId = parseInt(id as string);

  if (!userId) {
    return res.status(400).json({ message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
  }

  try {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    if (req.method === 'GET') {
      return res.status(200).json(users[userIndex]);
    }

    if (req.method === 'PUT') {
      // Parse body if it's a string
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return res.status(400).json({ message: 'ข้อมูล JSON ไม่ถูกต้อง' });
        }
      }

      const validation = updateProfileSchema.safeParse(body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'ข้อมูลไม่ถูกต้อง',
          errors: validation.error.errors 
        });
      }

      // Update user profile
      users[userIndex] = {
        ...users[userIndex],
        ...validation.data,
        lastActivity: new Date().toISOString()
      };

      setUsers(users);
      return res.status(200).json(users[userIndex]);
    }
    
    return res.status(405).json({ message: 'วิธีการเรียก API ไม่ถูกต้อง' });
    
  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}