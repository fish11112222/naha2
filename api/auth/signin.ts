export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Mock user data for demo
    const mockUsers = [
      { id: 1, email: 'kuy@gmail.com', password: '123456', firstName: 'กุ้ย', lastName: 'นาคา', username: 'kuy' },
      { id: 2, email: 'admin@chat.com', password: 'admin123', firstName: 'แอดมิน', lastName: 'ระบบ', username: 'admin' }
    ];

    const user = mockUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
}