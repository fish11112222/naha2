export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body for Vercel
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const { email, password, firstName, lastName, username } = body;

    // For demo purposes, return success
    const newUser = {
      id: Date.now(),
      email,
      firstName,
      lastName,
      username,
      createdAt: new Date().toISOString()
    };

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
}