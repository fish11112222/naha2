import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import EmojiPicker from "@/components/EmojiPicker";
import GifPicker from "@/components/GifPicker";
import FileUploader from "@/components/FileUploader";
import ThemeSelector from "@/components/ThemeSelector";
import OnlineUsersList from "@/components/OnlineUsersList";
import { Send, Edit, Trash2, LogOut, Users, Settings, User as UserIcon, Palette } from "lucide-react";
import { useLocation } from "wouter";
import { format, formatDistance } from "date-fns";
import type { Message, User, ChatTheme } from "@shared/schema";

interface EnhancedChatPageProps {
  currentUser: User;
  onSignOut: () => void;
}

export default function EnhancedChatPage({ currentUser, onSignOut }: EnhancedChatPageProps) {
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGif, setSelectedGif] = useState<{url: string, name: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Get messages with pagination
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 3000,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get current theme
  const { data: themeData } = useQuery<{ currentTheme: ChatTheme; availableThemes: ChatTheme[] }>({
    queryKey: ['/api/theme'],
    retry: false,
  });

  // Apply theme to CSS when theme data changes
  useEffect(() => {
    if (themeData?.currentTheme) {
      const theme = themeData.currentTheme;
      const root = document.documentElement;
      root.style.setProperty('--chat-primary', theme.primaryColor);
      root.style.setProperty('--chat-secondary', theme.secondaryColor);
      root.style.setProperty('--chat-background', theme.backgroundColor);
      root.style.setProperty('--chat-message-self', theme.messageBackgroundSelf);
      root.style.setProperty('--chat-message-other', theme.messageBackgroundOther);
      root.style.setProperty('--chat-text', theme.textColor);
      
      // Update body background
      document.body.style.backgroundColor = theme.backgroundColor;
    }
  }, [themeData?.currentTheme]);

  // Get online users count
  const { data: usersData } = useQuery<{count: number}>({
    queryKey: ["/api/users/count"],
    refetchInterval: 30000, // เพิ่มเป็น 30 วินาที
    staleTime: 5000,
  });
  const usersCount = usersData?.count || 0;

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (messageData: {
      content: string;
      username: string;
      userId: number;
      attachmentUrl?: string;
      attachmentType?: 'image' | 'file' | 'gif';
      attachmentName?: string;
    }) => {
      console.log("Creating message with data:", messageData);
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Message created successfully:", data);
      toast({
        title: "ส่งข้อความสำเร็จ!",
        description: "ข้อความของคุณถูกส่งแล้ว",
      });
      
      // Clear form
      setMessage("");
      setSelectedFile(null);
      setSelectedGif(null);
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      refetchMessages();
    },
    onError: (error: any) => {
      console.error("Error creating message:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถส่งข้อความได้",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    console.log("handleSendMessage called", { message, selectedFile, selectedGif, isPending: createMessageMutation.isPending });
    
    if ((!message.trim() && !selectedFile && !selectedGif)) {
      console.log("No content to send");
      return;
    }

    if (createMessageMutation.isPending) {
      console.log("Already sending message, skipping");
      return;
    }

    let attachmentUrl = "";
    let attachmentType: 'image' | 'file' | 'gif' | undefined;
    let attachmentName = "";

    // Handle file upload (simplified - in real app would upload to cloud storage)
    if (selectedFile) {
      // For demo, using data URL - in production should upload to cloud
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          attachmentUrl = reader.result as string;
          attachmentType = 'image';
          attachmentName = selectedFile.name;
          sendMessage();
        };
        reader.readAsDataURL(selectedFile);
        return;
      } else {
        // For non-image files, just use filename as attachment
        attachmentType = 'file';
        attachmentName = selectedFile.name;
        attachmentUrl = `file://${selectedFile.name}`;
      }
    }

    // Handle GIF
    if (selectedGif) {
      attachmentUrl = selectedGif.url;
      attachmentType = 'gif';
      attachmentName = selectedGif.name;
    }

    sendMessage();

    function sendMessage() {
      const messageData = {
        content: message.trim() || "", // Allow empty content for attachments
        username: `${currentUser.firstName} ${currentUser.lastName}`,
        userId: currentUser.id,
        ...(attachmentUrl && { attachmentUrl, attachmentType, attachmentName })
      };

      console.log("Sending message with data:", messageData);
      createMessageMutation.mutate(messageData);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleGifSelect = (gifUrl: string, gifName: string) => {
    setSelectedGif({url: gifUrl, name: gifName});
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const response = await apiRequest("PUT", `/api/messages/${id}`, { 
        content,
        userId: currentUser.id 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "แก้ไขข้อความสำเร็จ!",
        description: "ข้อความของคุณถูกแก้ไขแล้ว",
      });
      setEditingId(null);
      setEditingMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      refetchMessages();
    },
    onError: (error: any) => {
      console.error("Error updating message:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถแก้ไขข้อความได้",
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Deleting message:", id);
      
      // Use messages API endpoint with userId in query parameter
      const response = await fetch(`/api/messages/${id}?userId=${currentUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log("Delete response:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status}` };
        }
        throw new Error(errorData.message || "ไม่สามารถลบข้อความได้");
      }

      // For 204 responses, don't try to parse JSON
      if (response.status === 204) {
        return { success: true };
      }

      const responseText = await response.text();
      if (!responseText) {
        return { success: true };
      }

      return JSON.parse(responseText);
    },
    onSuccess: () => {
      // Force immediate refresh of messages
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.refetchQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "ลบข้อความสำเร็จ!",
        description: "ข้อความของคุณถูกลบแล้ว",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting message:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบข้อความได้",
        variant: "destructive",
      });
    },
  });

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditingMessage(msg.content);
  };

  const saveEdit = () => {
    if (editingId && editingMessage.trim()) {
      updateMessageMutation.mutate({ id: editingId, content: editingMessage.trim() });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingMessage("");
  };

  const deleteMessage = (id: number) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อความนี้?")) {
      deleteMessageMutation.mutate(id);
    }
  };

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ 
        backgroundColor: themeData?.currentTheme?.backgroundColor || '#f8fafc',
        color: themeData?.currentTheme?.textColor || '#1e293b'
      }}
    >
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0 shadow-lg">
        <CardHeader 
          className="py-4 sm:py-6 px-4 sm:px-8" 
          style={{ 
            background: `linear-gradient(135deg, ${themeData?.currentTheme?.primaryColor || '#3b82f6'}, ${themeData?.currentTheme?.secondaryColor || '#1e40af'})`,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            {/* Left side - Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <span className="text-white text-sm sm:text-base">💬</span>
              </div>
              <div className="min-w-0 overflow-hidden">
                <CardTitle className="text-sm sm:text-lg font-semibold truncate text-white">Chat Room</CardTitle>
                <p className="text-white text-opacity-80 text-xs sm:text-sm">
                  {usersCount} คนออนไลน์
                </p>
              </div>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* User profile */}
              <div 
                className="w-7 h-7 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white cursor-pointer hover:bg-opacity-30 transition-all hover:scale-105 flex-shrink-0 backdrop-blur-sm"
                onClick={() => setLocation("/profile")}
                title={`${currentUser.firstName} ${currentUser.lastName}`}
              >
                {currentUser.firstName[0]}{currentUser.lastName[0]}
              </div>
              
              {/* Theme selector */}
              <div className="flex-shrink-0">
                <ThemeSelector currentTheme={themeData?.currentTheme} />
              </div>
              
              {/* Action buttons */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLocation("/users")}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white hover:text-white flex-shrink-0 p-0 transition-all hover:scale-105 backdrop-blur-sm"
                title="ผู้ใช้ทั้งหมด"
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onSignOut}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white hover:text-white flex-shrink-0 p-0 transition-all hover:scale-105 backdrop-blur-sm"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="h-[calc(100vh-120px)] flex flex-col">
          <Card className="flex-1 flex flex-col shadow-xl">
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messagesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">กำลังโหลดข้อความ...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>ยังไม่มีข้อความในแชท</p>
                      <p className="text-sm">เริ่มการสนทนากันเลย!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwnMessage = msg.userId === currentUser.id && 
                                         msg.username === `${currentUser.firstName} ${currentUser.lastName}`;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group mb-3`}
                        >
                          <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? "order-2" : "order-1"}`}>
                            {!isOwnMessage && (
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs">
                                    {msg.username.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-gray-600">
                                  {msg.username}
                                </span>
                              </div>
                            )}

                            <div
                              className={`relative p-3 rounded-2xl shadow-sm ${
                                isOwnMessage ? "text-white" : ""
                              }`}
                              style={{
                                backgroundColor: isOwnMessage 
                                  ? themeData?.currentTheme?.messageBackgroundSelf || '#3b82f6'
                                  : themeData?.currentTheme?.messageBackgroundOther || '#e2e8f0',
                                color: isOwnMessage 
                                  ? '#ffffff' 
                                  : themeData?.currentTheme?.textColor || '#1e293b'
                              }}
                            >
                              {editingId === msg.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editingMessage}
                                    onChange={(e) => setEditingMessage(e.target.value)}
                                    className="text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <Button size="sm" onClick={saveEdit} disabled={updateMessageMutation.isPending}>
                                      บันทึก
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                      ยกเลิก
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Attachment Display */}
                                  {msg.attachmentUrl && (
                                    <div className="mb-2">
                                      {msg.attachmentType === 'image' ? (
                                        <img
                                          src={msg.attachmentUrl}
                                          alt={msg.attachmentName || "Shared image"}
                                          className="max-w-full h-auto rounded-lg"
                                        />
                                      ) : msg.attachmentType === 'gif' ? (
                                        <img
                                          src={msg.attachmentUrl}
                                          alt={msg.attachmentName || "Shared GIF"}
                                          className="max-w-full h-auto rounded-lg"
                                        />
                                      ) : (
                                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded text-gray-700">
                                          <span>📎</span>
                                          <span className="text-sm">{msg.attachmentName}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {msg.content && <p className="text-sm break-words">{msg.content}</p>}
                                  
                                  <div className="text-xs opacity-70 mt-2">
                                    <span>
                                      {format(new Date(msg.createdAt), 'MMM d, HH:mm')}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Message Actions - Outside message bubble, only for own messages */}
                            {isOwnMessage && editingId !== msg.id && (
                              <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(msg)}
                                  className="w-6 h-6 p-0 bg-white hover:bg-gray-100 border shadow-sm rounded-full"
                                  title="แก้ไขข้อความ"
                                >
                                  <Edit className="w-3 h-3 text-gray-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMessage(msg.id)}
                                  className="w-6 h-6 p-0 bg-white hover:bg-red-50 border shadow-sm rounded-full"
                                  disabled={deleteMessageMutation.isPending}
                                  title="ลบข้อความ"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 bg-white">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    {/* Preview selected file/gif */}
                    {(selectedFile || selectedGif) && (
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                        {selectedFile && (
                          <div className="flex items-center gap-2">
                            <span>📎</span>
                            <span className="text-sm">{selectedFile.name}</span>
                            <button 
                              onClick={() => setSelectedFile(null)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {selectedGif && (
                          <div className="flex items-center gap-2">
                            <img src={selectedGif.url} alt={selectedGif.name} className="w-8 h-8 rounded" />
                            <span className="text-sm">{selectedGif.name}</span>
                            <button 
                              onClick={() => setSelectedGif(null)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                      <GifPicker onGifSelect={handleGifSelect} />
                      <FileUploader onFileSelect={handleFileSelect} />
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[40px]"
                      />
                      <Button
                        onClick={() => {
                          console.log("Send button clicked");
                          handleSendMessage();
                        }}
                        disabled={createMessageMutation.isPending || (!message.trim() && !selectedFile && !selectedGif)}
                        style={{ backgroundColor: themeData?.currentTheme?.primaryColor || '#3b82f6' }}
                        className="text-white hover:opacity-90"
                      >
                        {createMessageMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}