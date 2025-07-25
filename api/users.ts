import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// Use environment variable to determine storage type
const USE_DATABASE = process.env.DATABASE_URL ? true : false;

// Conditional imports
let db: any, users: any, eq: any;
if (USE_DATABASE) {
  try {
    const dbModule = require('./db');
    db = dbModule.db;
    users = dbModule.users;
    const drizzleModule = require('drizzle-orm');
    eq = drizzleModule.eq;
  } catch (error) {
    console.log('Database not available, using fallback storage');
  }
}

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

// Fallback storage
const SHARED_USERS_KEY = 'VERCEL_SHARED_USERS_GLOBAL';
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

function saveUsers(userList: User[]): void {
  (global as any)[SHARED_USERS_KEY] = userList;
}

function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "กรุณาระบุชื่อจริง").optional(),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล").optional(),
  bio: z.string().max(500, "ประวัติส่วนตัวยาวเกินไป").optional(),
  location: z.string().max(100, "ที่อยู่ยาวเกินไป").optional(),
  website: z.string().url("URL ไม่ถูกต้อง").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const url = req.url || '';
    const pathParts = url.split('/');
    const isCount = url.includes('/count');
    const isOnline = url.includes('/online');
    const isActivity = url.includes('/activity');
    const isProfile = url.includes('/profile');
    const userId = pathParts.find(part => !isNaN(parseInt(part)));
    const userIdNum = userId ? parseInt(userId) : null;

    if (req.method === 'GET') {
      if (isCount) {
        // GET users count
        if (USE_DATABASE && db && users) {
          const result = await db.select().from(users);
          return res.status(200).json({ count: result.length });
        } else {
          const userList = getUsers();
          return res.status(200).json({ count: userList.length });
        }
      }

      if (isOnline) {
        // GET online users
        if (USE_DATABASE && db && users) {
          const result = await db.select().from(users);
          const onlineUsers = result.filter((u: User) => u.isOnline);
          return res.status(200).json(onlineUsers.map(u => ({ id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, avatar: u.avatar })));
        } else {
          const userList = getUsers();
          const onlineUsers = userList.filter(u => u.isOnline);
          return res.status(200).json(onlineUsers.map(u => ({ id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, avatar: u.avatar })));
        }
      }

      if (isProfile && userIdNum) {
        // GET specific user profile
        if (USE_DATABASE && db && users && eq) {
          const result = await db.select().from(users).where(eq(users.id, userIdNum));
          const user = result[0];
          if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
          }
          const { password, ...userWithoutPassword } = user;
          return res.status(200).json(userWithoutPassword);
        } else {
          const userList = getUsers();
          const user = userList.find(u => u.id === userIdNum);
          if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
          }
          const { password, ...userWithoutPassword } = user as any;
          return res.status(200).json(userWithoutPassword);
        }
      }

      if (userIdNum && !isProfile) {
        // GET specific user (redirect to profile)
        const modifiedReq = { ...req, url: req.url + '/profile' } as VercelRequest;
        return handler(modifiedReq, res);
      }

      // GET all users
      if (USE_DATABASE && db && users) {
        const result = await db.select().from(users);
        const sanitizedUsers = result.map((u: User) => {
          const { password, ...userWithoutPassword } = u as any;
          return userWithoutPassword;
        });
        return res.status(200).json(sanitizedUsers);
      } else {
        const userList = getUsers();
        const sanitizedUsers = userList.map(u => {
          const { password, ...userWithoutPassword } = u as any;
          return userWithoutPassword;
        });
        return res.status(200).json(sanitizedUsers);
      }
    }

    if (req.method === 'PUT') {
      if (isActivity && userIdNum) {
        // PUT update user activity
        if (USE_DATABASE && db && users && eq) {
          await db.update(users)
            .set({ 
              isOnline: true,
              lastActivity: new Date()
            })
            .where(eq(users.id, userIdNum));
          
          return res.status(200).json({ message: 'อัปเดตกิจกรรมแล้ว' });
        } else {
          const userList = getUsers();
          const user = userList.find(u => u.id === userIdNum);
          if (user) {
            user.isOnline = true;
            user.lastActivity = new Date().toISOString();
            saveUsers(userList);
          }
          return res.status(200).json({ message: 'อัปเดตกิจกรรมแล้ว' });
        }
      }

      if (isProfile && userIdNum) {
        // PUT update user profile
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

        const validatedData = updateProfileSchema.parse(requestBody);

        if (USE_DATABASE && db && users && eq) {
          const updateData: any = {};
          if (validatedData.firstName) updateData.firstName = validatedData.firstName;
          if (validatedData.lastName) updateData.lastName = validatedData.lastName;
          if (validatedData.bio !== undefined) updateData.bio = validatedData.bio || null;
          if (validatedData.location !== undefined) updateData.location = validatedData.location || null;
          if (validatedData.website !== undefined) updateData.website = validatedData.website || null;
          if (validatedData.dateOfBirth !== undefined) updateData.dateOfBirth = validatedData.dateOfBirth || null;

          const result = await db.update(users)
            .set(updateData)
            .where(eq(users.id, userIdNum))
            .returning();

          const updatedUser = result[0];
          if (!updatedUser) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
          }

          const { password, ...userWithoutPassword } = updatedUser;
          return res.status(200).json(userWithoutPassword);
        } else {
          const userList = getUsers();
          const userIndex = userList.findIndex(u => u.id === userIdNum);
          
          if (userIndex === -1) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
          }

          const user = userList[userIndex];
          if (validatedData.firstName) user.firstName = validatedData.firstName;
          if (validatedData.lastName) user.lastName = validatedData.lastName;
          if (validatedData.bio !== undefined) user.bio = validatedData.bio || null;
          if (validatedData.location !== undefined) user.location = validatedData.location || null;
          if (validatedData.website !== undefined) user.website = validatedData.website || null;
          if (validatedData.dateOfBirth !== undefined) user.dateOfBirth = validatedData.dateOfBirth || null;

          saveUsers(userList);

          const { password, ...userWithoutPassword } = user as any;
          return res.status(200).json(userWithoutPassword);
        }
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
    
    console.error('Users error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}