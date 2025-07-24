import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, updateMessageSchema, signUpSchema, signInSchema, chatThemes, chatSettings, updateProfileSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signUpSchema.parse(req.body);
      
      // Check if user already exists
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      const user = await storage.createUser(validatedData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create account" });
      }
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const validatedData = signInSchema.parse(req.body);
      const user = await storage.authenticateUser(validatedData);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to sign in" });
      }
    }
  });

  // Get users count (must be before the parameterized route)
  app.get("/api/users/count", async (req, res) => {
    try {
      const count = await storage.getUsersCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching users count:", error);
      res.status(500).json({ message: "Failed to fetch users count" });
    }
  });

  // Get total registered users count
  app.get("/api/users/total", async (req, res) => {
    try {
      const count = await storage.getTotalUsersCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching total users count:", error);
      res.status(500).json({ message: "Failed to fetch total users count" });
    }
  });

  // Get all registered users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get online users list (must be before the parameterized route)
  app.get("/api/users/online", async (req, res) => {
    try {
      const users = await storage.getOnlineUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching online users:", error);
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });


  // Get all messages with pagination and size limit
  app.get("/api/messages", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const allMessages = await storage.getMessages();
      
      // Limit attachment data size to prevent huge responses
      const optimizedMessages = allMessages.map(msg => {
        if (msg.attachmentUrl && msg.attachmentType === 'image' && msg.attachmentUrl.startsWith('data:')) {
          // Keep only first 1000 chars of base64 data for preview
          return {
            ...msg,
            attachmentUrl: msg.attachmentUrl.slice(0, 1000) + '...[truncated]'
          };
        }
        return msg;
      });
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMessages = optimizedMessages.slice(startIndex, endIndex);
      
      console.log(`Returning ${paginatedMessages.length}/${allMessages.length} messages (page ${page})`);
      
      // Set proper headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Total-Count', allMessages.length.toString());
      
      res.json(paginatedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Create a new message
  app.post("/api/messages", async (req, res) => {
    try {
      console.log("Received message data:", req.body);
      
      // For attachment-only messages, ensure content is at least empty string
      if (!req.body.content && req.body.attachmentUrl) {
        req.body.content = "";
      }
      
      const validatedData = insertMessageSchema.parse(req.body);
      console.log("Validated message data:", validatedData);
      const message = await storage.createMessage(validatedData);
      console.log("Created message:", message);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error creating message:", error.errors);
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating message:", error);
        res.status(500).json({ message: "Failed to create message" });
      }
    }
  });

  // Update a message (both PATCH and PUT)
  const updateMessageHandler = async (req: any, res: any) => {
    try {
      const messageId = parseInt(req.params.id);
      const { userId, ...updateData } = req.body;
      
      if (!userId) {
        console.log("Update request without userId for message:", messageId);
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Get the message first to check ownership
      const message = await storage.getMessageById(messageId);
      if (!message) {
        console.log("Message not found for update:", messageId);
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Check if the user owns this message
      if (message.userId !== userId) {
        console.log(`Unauthorized update attempt: User ${userId} tried to update message ${messageId} owned by user ${message.userId}`);
        return res.status(403).json({ message: "You can only edit your own messages" });
      }
      
      const validatedData = updateMessageSchema.parse(updateData);
      console.log(`User ${userId} updating their message ${messageId}`);
      const updatedMessage = await storage.updateMessage(messageId, userId, validatedData);
      
      if (!updatedMessage) {
        console.log("Failed to update message in storage:", messageId);
        return res.status(500).json({ message: "Failed to update message in storage" });
      }
      
      console.log(`Message ${messageId} successfully updated by user ${userId}`);
      res.json(updatedMessage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating message:", error);
        res.status(500).json({ message: "Failed to update message" });
      }
    }
  };

  app.patch("/api/messages/:id", updateMessageHandler);
  app.put("/api/messages/:id", updateMessageHandler);

  // Delete a message
  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      console.log("Delete request received for message:", messageId);
      console.log("Query parameters:", req.query);
      console.log("Request body:", req.body);
      
      // Get userId from query parameter instead of body for DELETE requests
      const userId = parseInt(req.query.userId as string);
      console.log("Parsed userId from query:", userId);
      
      if (!userId || isNaN(userId)) {
        console.log("Delete request without valid userId for message:", messageId);
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Get the message first to check ownership
      const message = await storage.getMessageById(messageId);
      if (!message) {
        console.log("Message not found for deletion:", messageId);
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Check if the user owns this message
      if (message.userId !== userId) {
        console.log(`Unauthorized delete attempt: User ${userId} tried to delete message ${messageId} owned by user ${message.userId}`);
        return res.status(403).json({ message: "You can only delete your own messages" });
      }
      
      console.log(`User ${userId} deleting their message ${messageId}`);
      const deleted = await storage.deleteMessage(messageId, userId);
      
      if (!deleted) {
        console.log("Failed to delete message from storage:", messageId);
        return res.status(500).json({ message: "Failed to delete message from storage" });
      }
      
      console.log(`Message ${messageId} successfully deleted by user ${userId}`);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Message actions endpoint (compatible with Vercel API)
  app.delete("/api/message-actions", async (req, res) => {
    try {
      const messageId = parseInt(req.query.id as string);
      const action = req.query.action as string;
      const userId = parseInt(req.query.userId as string);
      
      console.log("Message action request:", { messageId, action, userId });
      
      if (action !== 'delete') {
        return res.status(400).json({ message: "Only delete action is supported" });
      }
      
      if (!messageId || !userId || isNaN(messageId) || isNaN(userId)) {
        return res.status(400).json({ message: "Message ID and User ID are required" });
      }
      
      // Get the message first to check ownership
      const message = await storage.getMessageById(messageId);
      if (!message) {
        return res.status(404).json({ message: "ไม่พบข้อความ" });
      }
      
      // Check if the user owns this message
      if (message.userId !== userId) {
        return res.status(403).json({ message: "คุณไม่สามารถลบข้อความของผู้อื่นได้" });
      }
      
      console.log(`User ${userId} deleting their message ${messageId} via message-actions`);
      const deleted = await storage.deleteMessage(messageId, userId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete message from storage" });
      }
      
      console.log(`Message ${messageId} successfully deleted by user ${userId} via message-actions`);
      res.status(204).send();
    } catch (error) {
      console.error("Error in message-actions:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อความ" });
    }
  });

  // Update user activity (heartbeat)
  app.post("/api/users/:id/activity", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await storage.updateUserActivity(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user activity:", error);
      res.status(500).json({ message: "Failed to update user activity" });
    }
  });

  // Get user profile by ID
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error getting user profile:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์" });
    }
  });

  // Get user message count
  app.get("/api/users/:id/messages/count", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const count = await storage.getUserMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting user message count:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงจำนวนข้อความ" });
    }
  });

  // Update user profile
  app.put("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const validatedData = updateProfileSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", errors: error.errors });
      } else {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์" });
      }
    }
  });

  // Get all users (for user discovery)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove passwords from all users
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error getting all users:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน" });
    }
  });

  // Get current theme
  app.get("/api/theme", async (req, res) => {
    try {
      const currentTheme = await storage.getActiveTheme();
      const availableThemes = await storage.getAvailableThemes();
      res.json({ 
        currentTheme, 
        availableThemes 
      });
    } catch (error) {
      console.error("Error fetching theme:", error);
      res.status(500).json({ message: "Failed to fetch theme" });
    }
  });

  // Change theme
  app.post("/api/theme", async (req, res) => {
    try {
      const { themeId } = req.body;
      
      if (!themeId || typeof themeId !== 'number') {
        return res.status(400).json({ message: "Theme ID is required and must be a number" });
      }
      
      const currentTheme = await storage.setActiveTheme(themeId);
      const availableThemes = await storage.getAvailableThemes();
      res.json({ 
        currentTheme, 
        availableThemes 
      });
    } catch (error) {
      console.error("Error changing theme:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to change theme" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
