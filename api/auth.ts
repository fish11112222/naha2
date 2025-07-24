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
  password?: string;
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
    password: "12345qazAZ",
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
    password: "12345qazAZ",
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

const signInSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณาระบุรหัสผ่าน"),
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

    // Determine if this is signin or signup based on URL or body
    const url = req.url || '';
    const isSignup = url.includes('signup') || requestBody.action === 'signup';

    if (isSignup) {
      // SIGNUP
      const validatedData = signUpSchema.parse(requestBody);

      if (USE_DATABASE && db && users && eq) {
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
      } else {
        const userList = getUsers();
        
        // Check if email already exists
        const existingEmail = userList.find(u => u.email === validatedData.email);
        if (existingEmail) {
          return res.status(409).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
        }

        // Check if username already exists
        const existingUsername = userList.find(u => u.username === validatedData.username);
        if (existingUsername) {
          return res.status(409).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
        }

        const newId = Math.max(...userList.map(u => u.id), 0) + 1;
        const newUser: User = {
          id: newId,
          username: validatedData.username,
          email: validatedData.email,
          password: validatedData.password,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          avatar: null,
          bio: null,
          location: null,
          website: null,
          dateOfBirth: null,
          isOnline: true,
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        userList.push(newUser);
        saveUsers(userList);

        const { password, ...userWithoutPassword } = newUser;
        console.log(`Created user ${newUser.id} (${newUser.email}) in fallback storage`);
        return res.status(201).json(userWithoutPassword);
      }
    } else {
      // SIGNIN
      const validatedData = signInSchema.parse(requestBody);

      if (USE_DATABASE && db && users && eq) {
        // Find user by email
        const result = await db.select().from(users).where(eq(users.email, validatedData.email));
        const user = result[0];

        if (!user || user.password !== validatedData.password) {
          return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // Update last activity
        await db.update(users)
          .set({ 
            isOnline: true,
            lastActivity: new Date()
          })
          .where(eq(users.id, user.id));

        const { password, ...userWithoutPassword } = user;

        console.log(`User ${user.id} (${user.email}) signed in via database`);
        return res.status(200).json(userWithoutPassword);
      } else {
        const userList = getUsers();
        const user = userList.find(u => u.email === validatedData.email);

        if (!user || user.password !== validatedData.password) {
          return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // Update last activity
        user.isOnline = true;
        user.lastActivity = new Date().toISOString();
        saveUsers(userList);

        const { password, ...userWithoutPassword } = user;
        console.log(`User ${user.id} (${user.email}) signed in via fallback storage`);
        return res.status(200).json(userWithoutPassword);
      }
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "ข้อมูลไม่ถูกต้อง", 
        errors: error.errors 
      });
    }
    
    console.error('Auth error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}