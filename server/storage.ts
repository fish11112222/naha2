
import { type User, type SignUpData, type SignInData, type Message, type InsertMessage, type UpdateMessage, type ChatTheme, type ChatSettings, type UpdateProfile } from "@shared/schema";
import * as fs from 'fs';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: SignUpData): Promise<User>;
  authenticateUser(credentials: SignInData): Promise<User | null>;
  updateUserProfile(userId: number, updates: UpdateProfile): Promise<User | null>;

  // Message CRUD operations
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, userId: number, updates: UpdateMessage): Promise<Message | null>;
  deleteMessage(id: number, userId: number): Promise<boolean>;
  getMessageById(id: number): Promise<Message | undefined>;

  // Theme and settings operations
  getActiveTheme(): Promise<ChatTheme | undefined>;
  setActiveTheme(themeId: number): Promise<ChatTheme>;
  getUsersCount(): Promise<number>;
  getOnlineUsers(): Promise<User[]>;
  updateUserActivity(userId: number): Promise<void>;
  getTotalUsersCount(): Promise<number>;
  getUserMessageCount(userId: number): Promise<number>;
}

export class MemoryStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private userActivity: Map<number, Date>;
  private currentTheme: ChatTheme;
  private themes: Map<number, ChatTheme>;
  private nextUserId: number;
  private nextMessageId: number;
  private dataFile: string;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.userActivity = new Map();
    this.themes = new Map();
    this.nextUserId = 1;
    this.nextMessageId = 1;
    this.dataFile = 'chat-data.json';
    this.initializeThemes();
    this.currentTheme = this.themes.get(1)!; // Default to first theme
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        
        if (data.users) {
          this.users = new Map(Object.entries(data.users).map(([id, user]: [string, any]) => [
            parseInt(id), 
            {
              ...user as User,
              createdAt: new Date(user.createdAt),
              lastActivity: user.lastActivity ? new Date(user.lastActivity) : null,
              dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null
            }
          ]));
        }
        
        if (data.messages) {
          this.messages = new Map(Object.entries(data.messages).map(([id, message]: [string, any]) => [
            parseInt(id), 
            {
              ...message as Message,
              createdAt: new Date(message.createdAt),
              updatedAt: message.updatedAt ? new Date(message.updatedAt) : null
            }
          ]));
        }
        
        if (data.nextUserId) this.nextUserId = data.nextUserId;
        if (data.nextMessageId) this.nextMessageId = data.nextMessageId;
        
        console.log(`Loaded ${this.users.size} users and ${this.messages.size} messages from storage`);
      }
    } catch (error: any) {
      console.log('No existing data file or error loading data:', error.message);
    }
  }

  private saveData() {
    try {
      const data = {
        users: Object.fromEntries(this.users),
        messages: Object.fromEntries(this.messages),
        nextUserId: this.nextUserId,
        nextMessageId: this.nextMessageId
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  private initializeThemes() {
    const defaultThemes = [
      {
        id: 1,
        name: "Classic Blue",
        primaryColor: "#3b82f6",
        secondaryColor: "#1e40af", 
        backgroundColor: "#f8fafc",
        messageBackgroundSelf: "#3b82f6",
        messageBackgroundOther: "#e2e8f0",
        textColor: "#1e293b",
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 2,
        name: "Sunset Orange",
        primaryColor: "#f59e0b",
        secondaryColor: "#d97706",
        backgroundColor: "#fef3c7",
        messageBackgroundSelf: "#f59e0b",
        messageBackgroundOther: "#fed7aa",
        textColor: "#92400e",
        isActive: false,
        createdAt: new Date()
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
        isActive: false,
        createdAt: new Date()
      },
      {
        id: 4,
        name: "Purple Dreams",
        primaryColor: "#8b5cf6",
        secondaryColor: "#7c3aed",
        backgroundColor: "#f3f4f6",
        messageBackgroundSelf: "#8b5cf6",
        messageBackgroundOther: "#e5e7eb",
        textColor: "#374151",
        isActive: false,
        createdAt: new Date()
      },
      {
        id: 5,
        name: "Rose Gold",
        primaryColor: "#f43f5e",
        secondaryColor: "#e11d48",
        backgroundColor: "#fdf2f8",
        messageBackgroundSelf: "#f43f5e",
        messageBackgroundOther: "#fce7f3",
        textColor: "#881337",
        isActive: false,
        createdAt: new Date()
      },
      {
        id: 6,
        name: "Dark Mode",
        primaryColor: "#6366f1",
        secondaryColor: "#4f46e5",
        backgroundColor: "#111827",
        messageBackgroundSelf: "#6366f1",
        messageBackgroundOther: "#374151",
        textColor: "#f9fafb",
        isActive: false,
        createdAt: new Date()
      }
    ];

    defaultThemes.forEach(theme => {
      this.themes.set(theme.id, theme);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(signUpData: SignUpData): Promise<User> {
    // Check if user already exists by email
    const existingUser = await this.getUserByEmail(signUpData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check if username already exists
    const existingUsername = await this.getUserByUsername(signUpData.username);
    if (existingUsername) {
      throw new Error("Username already taken");
    }

    // Generate truly unique ID using timestamp + random
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    let newId = parseInt(`${timestamp}${random}`.slice(-8)); // Take last 8 digits to keep it manageable
    
    // Ensure it's not already used (very unlikely but just in case)
    while (this.users.has(newId)) {
      newId++;
    }

    const user: User = {
      id: newId,
      ...signUpData,
      avatar: null,
      bio: null,
      location: null,
      website: null,
      dateOfBirth: null,
      isOnline: false,
      lastActivity: null,
      createdAt: new Date(),
    };
    
    this.users.set(user.id, user);
    this.saveData(); // Save immediately after creating user
    console.log("User created successfully with unique ID:", user.id, user.firstName, user.lastName);
    
    // Update nextUserId to ensure no conflicts
    this.nextUserId = Math.max(this.nextUserId, newId + 1);
    
    return user;
  }

  async authenticateUser(credentials: SignInData): Promise<User | null> {
    try {
      const user = await this.getUserByEmail(credentials.email);
      if (!user) {
        console.log("User not found:", credentials.email);
        return null;
      }

      // For development, we're using plain text password comparison
      // In production, you should use proper password hashing
      if (user.password !== credentials.password) {
        console.log("Password mismatch for user:", credentials.email);
        return null;
      }

      console.log("Authentication successful for user:", user.email);
      return user;
    } catch (error) {
      console.error("Error authenticating user:", error);
      return null;
    }
  }

  async updateUserProfile(userId: number, updates: UpdateProfile): Promise<User | null> {
    const user = this.users.get(userId);
    
    if (!user) {
      console.log(`User ${userId} not found for profile update`);
      return null;
    }

    // Convert dateOfBirth string to Date if provided
    const dateOfBirth = updates.dateOfBirth ? new Date(updates.dateOfBirth) : user.dateOfBirth;

    // Validate avatar size if provided
    if (updates.avatar) {
      const avatarSize = new Blob([updates.avatar]).size;
      if (avatarSize > 2 * 1024 * 1024) { // 2MB limit for base64 data
        console.log(`Avatar too large for user ${userId}: ${avatarSize} bytes`);
        throw new Error("รูปภาพมีขนาดใหญ่เกินไป กรุณาลองใหม่");
      }
    }

    // Create updated user object with selective updates
    const updatedUser: User = {
      ...user,
      firstName: updates.firstName || user.firstName,
      lastName: updates.lastName || user.lastName,
      bio: updates.bio !== undefined ? updates.bio : user.bio,
      location: updates.location !== undefined ? updates.location : user.location,
      website: updates.website !== undefined ? updates.website : user.website,
      avatar: updates.avatar !== undefined ? updates.avatar : user.avatar,
      dateOfBirth,
    };
    
    this.users.set(userId, updatedUser);
    this.saveData(); // Save after profile update
    console.log(`Profile updated for user ${userId}:`, {
      firstName: updates.firstName,
      lastName: updates.lastName,
      bio: updates.bio?.substring(0, 50),
      location: updates.location,
      website: updates.website,
      hasAvatar: !!updates.avatar,
      avatarSize: updates.avatar ? new Blob([updates.avatar]).size : 0
    });
    return updatedUser;
  }

  async getMessages(): Promise<Message[]> {
    const messageList = Array.from(this.messages.values());
    console.log(`Storage has ${messageList.length} messages`);
    return messageList.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.nextMessageId++,
      content: insertMessage.content || "",
      username: insertMessage.username,
      userId: insertMessage.userId,
      attachmentUrl: insertMessage.attachmentUrl || null,
      attachmentType: insertMessage.attachmentType || null,
      attachmentName: insertMessage.attachmentName || null,
      createdAt: new Date(),
      updatedAt: null,
    };
    
    this.messages.set(message.id, message);
    this.saveData(); // Save after creating message
    return message;
  }

  async updateMessage(id: number, userId: number, updates: UpdateMessage): Promise<Message | null> {
    const message = this.messages.get(id);
    if (!message || message.userId !== userId) {
      return null;
    }
    
    const updatedMessage: Message = {
      ...message,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.messages.set(id, updatedMessage);
    this.saveData(); // Save after updating message
    return updatedMessage;
  }

  async deleteMessage(id: number, userId: number): Promise<boolean> {
    const message = this.messages.get(id);
    
    if (!message) {
      console.log(`Message ${id} not found`);
      return false;
    }

    // Get user details for better logging
    const user = await this.getUser(userId);
    const messageOwner = await this.getUser(message.userId);
    
    console.log(`Delete attempt: Message ${id} (owner: ${messageOwner?.firstName} ${messageOwner?.lastName}, ID: ${message.userId}) by user ${user?.firstName} ${user?.lastName} (ID: ${userId})`);

    // STRICT ownership check - both ID and user must exist and match
    if (message.userId !== userId || !user || !messageOwner) {
      console.log(`❌ SECURITY VIOLATION: User ${userId} (${user?.firstName} ${user?.lastName}) attempting to delete message ${id} owned by user ${message.userId} (${messageOwner?.firstName} ${messageOwner?.lastName})`);
      console.log(`❌ Details: messageUserId=${message.userId}, currentUserId=${userId}, userExists=${!!user}, messageOwnerExists=${!!messageOwner}`);
      return false;
    }

    // Additional check: ensure user and message owner are actually the same person by comparing all fields
    if (user.email !== messageOwner.email || user.username !== messageOwner.username) {
      console.log(`❌ SECURITY VIOLATION: ID match but user data doesn't match!`);
      console.log(`❌ Current user: ${user.email}, ${user.username}`);
      console.log(`❌ Message owner: ${messageOwner.email}, ${messageOwner.username}`);
      return false;
    }

    console.log(`✅ User ${userId} deleting their own message ${id}`);
    const deleted = this.messages.delete(id);
    
    if (deleted) {
      this.saveData(); // Save after deleting message
      console.log(`✅ Message ${id} successfully deleted by user ${userId}`);
    } else {
      console.log(`❌ Failed to delete message ${id}`);
    }
    
    return deleted;
  }

  async getMessageById(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getActiveTheme(): Promise<ChatTheme | undefined> {
    return this.currentTheme;
  }

  async getAvailableThemes(): Promise<ChatTheme[]> {
    return Array.from(this.themes.values());
  }

  async setActiveTheme(themeId: number): Promise<ChatTheme> {
    const theme = this.themes.get(themeId);
    if (!theme) {
      throw new Error(`Theme with ID ${themeId} not found`);
    }
    this.currentTheme = theme;
    this.saveData(); // Save after theme change
    return theme;
  }

  async getUsersCount(): Promise<number> {
    let activeRegisteredUsers = 0;
    for (const user of Array.from(this.users.values())) {
      if (this.isUserActive(user.id)) {
        activeRegisteredUsers++;
      }
    }
    return activeRegisteredUsers;
  }

  async getOnlineUsers(): Promise<User[]> {
    const allUsers = Array.from(this.users.values());
    
    return allUsers.map(user => {
      const lastActive = this.userActivity.get(user.id);
      
      return {
        ...user,
        lastActivity: lastActive || null
      };
    });
  }

  private isUserActive(userId: number): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const lastActive = this.userActivity.get(userId);
    return !lastActive || lastActive > fiveMinutesAgo;
  }

  async updateUserActivity(userId: number): Promise<void> {
    this.userActivity.set(userId, new Date());
    
    // Also update user record
    const user = this.users.get(userId);
    if (user) {
      user.lastActivity = new Date();
      this.users.set(userId, user);
    }
  }

  async getTotalUsersCount(): Promise<number> {
    return this.users.size;
  }

  async getUserMessageCount(userId: number): Promise<number> {
    let count = 0;
    const messages = Array.from(this.messages.values());
    for (const message of messages) {
      if (message.userId === userId) {
        count++;
      }
    }
    return count;
  }
}

// Database Storage Implementation (disabled for migration)
// To re-enable: provide DATABASE_URL and uncomment this class
/*
export class DatabaseStorage implements IStorage {
  // DatabaseStorage implementation commented out for migration
  // Will be re-enabled when PostgreSQL database is provisioned
}
*/

// Use MemoryStorage for migration to Replit environment
// Switch to DatabaseStorage when database is provisioned
export const storage = new MemoryStorage();
