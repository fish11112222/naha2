import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
  };
}

const THEMES: Theme[] = [
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    colors: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      background: '#f8fafc',
      text: '#1f2937',
      border: '#e5e7eb'
    }
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      background: '#fffbeb',
      text: '#92400e',
      border: '#fed7aa'
    }
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      background: '#f0fdf4',
      text: '#065f46',
      border: '#bbf7d0'
    }
  },
  {
    id: 'purple-dreams',
    name: 'Purple Dreams',
    colors: {
      primary: '#9333ea',
      secondary: '#7c3aed',
      background: '#faf5ff',
      text: '#581c87',
      border: '#ddd6fe'
    }
  }
];

// Fallback storage
const SHARED_THEME_KEY = 'VERCEL_SHARED_THEME_GLOBAL';
const DEFAULT_THEME = 'classic-blue';

function getCurrentTheme(): string {
  if (!(global as any)[SHARED_THEME_KEY]) {
    (global as any)[SHARED_THEME_KEY] = DEFAULT_THEME;
  }
  return (global as any)[SHARED_THEME_KEY];
}

function setCurrentTheme(themeId: string): void {
  (global as any)[SHARED_THEME_KEY] = themeId;
}

function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

const themeSchema = z.object({
  themeId: z.union([z.string(), z.number()]).transform(val => {
    if (typeof val === 'string') {
      // Handle string IDs like "classic-blue"
      const theme = THEMES.find(t => t.id === val);
      return theme ? theme.id : val;
    }
    // Handle numeric IDs - convert to string
    const theme = THEMES.find(t => t.id === val.toString() || parseInt(t.id) === val);
    return theme ? theme.id : val.toString();
  }),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const currentThemeId = getCurrentTheme();
      const currentTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
      
      return res.status(200).json({
        currentTheme: currentTheme,
        availableThemes: THEMES
      });
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
      
      // Handle both string and numeric theme IDs
      let themeToSelect;
      
      if (typeof requestBody.themeId === 'number') {
        // Handle numeric ID from database format
        themeToSelect = THEMES[requestBody.themeId - 1] || THEMES.find(t => parseInt(t.id) === requestBody.themeId);
      } else {
        // Handle string ID from new format
        themeToSelect = THEMES.find(t => t.id === requestBody.themeId);
      }
      
      if (!themeToSelect) {
        return res.status(404).json({ message: 'ไม่พบธีมที่เลือก' });
      }
      
      setCurrentTheme(themeToSelect.id);
      
      console.log(`Theme changed to: ${themeToSelect.id} (${themeToSelect.name})`);
      return res.status(200).json({
        message: 'เปลี่ยนธีมสำเร็จ',
        currentTheme: themeToSelect,
        availableThemes: THEMES
      });
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "ข้อมูลไม่ถูกต้อง", 
        errors: error.errors 
      });
    }
    
    console.error('Theme error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}