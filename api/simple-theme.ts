import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// Global storage key
const SHARED_THEME_KEY = 'VERCEL_SHARED_THEME_SIMPLE';
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

function enableCors(res: VercelResponse): void {
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
      
      const themeId = requestBody.themeId;
      if (!themeId) {
        return res.status(400).json({ message: 'กรุณาระบุ theme ID' });
      }
      
      const themeToSelect = THEMES.find(t => t.id === themeId);
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
    console.error('Theme error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}