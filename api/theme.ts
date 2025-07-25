// Global theme storage for demo
let currentTheme = {
  id: 1,
  name: "Classic Blue",
  primaryColor: "#3b82f6",
  secondaryColor: "#1e40af",
  backgroundColor: "#f8fafc",
  messageBackgroundSelf: "#3b82f6",
  messageBackgroundOther: "#e2e8f0",
  textColor: "#1e293b",
  isActive: true
};

const availableThemes = [
  currentTheme,
  {
    id: 2,
    name: "Sunset Orange",
    primaryColor: "#f59e0b",
    secondaryColor: "#d97706",
    backgroundColor: "#fef3c7",
    messageBackgroundSelf: "#f59e0b",
    messageBackgroundOther: "#fed7aa",
    textColor: "#92400e",
    isActive: false
  },
  {
    id: 3,
    name: "Forest Green",
    primaryColor: "#10b981",
    secondaryColor: "#059669",
    backgroundColor: "#ecfdf5",
    messageBackgroundSelf: "#10b981",
    messageBackgroundOther: "#d1fae5",
    textColor: "#064e3b",
    isActive: false
  }
];

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({ 
      currentTheme, 
      availableThemes 
    });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { themeId } = req.body;
      const theme = availableThemes.find(t => t.id === themeId);
      
      if (!theme) {
        return res.status(404).json({ error: 'ไม่พบธีมที่เลือก' });
      }

      currentTheme = { ...theme, isActive: true };
      return res.status(200).json({ 
        currentTheme, 
        availableThemes 
      });
    } catch (error) {
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยนธีม' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}