export default function handler(req: any, res: any) {
  res.status(200).json({ 
    message: "Thai Chat API is running",
    timestamp: new Date().toISOString(),
    status: "ok"
  });
}