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
    queryFn: async () => {
      const response = await fetch("/api/messages?limit=100"); // Get last 100 messages
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
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
      
      // Support both old format (primaryColor) and new format (colors.primary)
      const primaryColor = theme.colors?.primary || theme.primaryColor || '#3b82f6';
      const secondaryColor = theme.colors?.secondary || theme.secondaryColor || '#1e40af';
      const backgroundColor = theme.colors?.background || theme.backgroundColor || '#f8fafc';
      const textColor = theme.colors?.text || theme.textColor || '#1e293b';
      const borderColor = theme.colors?.border || theme.messageBackgroundOther || '#e2e8f0';
      
      root.style.setProperty('--chat-primary', primaryColor);
      root.style.setProperty('--chat-secondary', secondaryColor);
      root.style.setProperty('--chat-background', backgroundColor);
      root.style.setProperty('--chat-message-self', primaryColor);
      root.style.setProperty('--chat-message-other', borderColor);
      root.style.setProperty('--chat-text', textColor);
      
      // Update body background
      document.body.style.backgroundColor = backgroundColor;
      
      console.log(`Applied theme: ${theme.name}`, {
        primaryColor,
        secondaryColor,
        backgroundColor,
        textColor,
        borderColor
      });
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
      console.log("Sending message:", messageData);
      const response = await apiRequest("POST", "/api/messages", messageData);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Message sent successfully:", data);
      setMessage("");
      setSelectedFile(null);
      setSelectedGif(null);
      
      // Force immediate refetch
      try {
        await queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        await refetchMessages();
        console.log("Messages refetched after sending");
      } catch (error) {
        console.error("Error refetching messages:", error);
      }
      
      setTimeout(() => {
        scrollToBottom();
      }, 200);
      
      toast({
        title: "ส่งข้อความแล้ว!",
        description: "ข้อความของคุณถูกส่งเรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      toast({
        title: "ส่งข้อความไม่สำเร็จ",
        description: error.message || "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    },
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const response = await apiRequest("PUT", `/api/messages/${id}?userId=${currentUser.id}`, { 
        content,
        userId: currentUser.id,
      });
      return response.json();
    },
    onSuccess: () => {
      setEditingId(null);
      setEditingMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "แก้ไขข้อความสำเร็จ",
        description: "ข้อความของคุณถูกแก้ไขเรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถแก้ไขข้อความได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Deleting message:", id);
      
      // Use consolidated API endpoint
      const response = await apiRequest("DELETE", `/api/messages/${id}?userId=${currentUser.id}`);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      return { messageId: id };
    },
    onSuccess: () => {
      // Force immediate refresh of messages
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.refetchQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "ลบข้อความแล้ว!",
        description: "ข้อความของคุณถูกลบเรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      console.error("Delete message error:", error);
      toast({
        title: "ลบข้อความไม่สำเร็จ",
        description: error.message || "ไม่สามารถลบข้อความได้",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // User activity heartbeat - update every 30 seconds
  useEffect(() => {
    const updateActivity = async () => {
      try {
        await apiRequest("POST", `/api/users/${currentUser.id}/activity`, {});
      } catch (error) {
        console.error("Failed to update activity:", error);
      }
    };

    // Update immediately when component mounts
    updateActivity();

    // Then update every 30 seconds
    const interval = setInterval(updateActivity, 30000);

    // Update on user interaction
    const handleUserActivity = () => {
      updateActivity();
    };

    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [currentUser.id]);

  // Theme is now handled in the main useEffect above

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
        attachmentUrl = `file://${selectedFile.name}`;
        attachmentType = 'file';
        attachmentName = selectedFile.name;
      }
    }

    if (selectedGif) {
      attachmentUrl = selectedGif.url;
      attachmentType = 'gif';
      attachmentName = selectedGif.name;
    }

    sendMessage();

    function sendMessage() {
      const messageData = {
        content: message.trim() || (selectedFile ? `Shared: ${selectedFile.name}` : selectedGif?.name || ""),
        username: `${currentUser.firstName} ${currentUser.lastName}`,
        userId: currentUser.id,
        attachmentUrl: attachmentUrl || undefined,
        attachmentType: attachmentType,
        attachmentName: attachmentName || undefined,
      };
      
      console.log("About to send message:", messageData);
      createMessageMutation.mutate(messageData);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleGifSelect = (gifUrl: string, gifName: string) => {
    setSelectedGif({ url: gifUrl, name: gifName });
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const startEdit = (id: number, content: string) => {
    setEditingId(id);
    setEditingMessage(content);
  };

  const saveEdit = () => {
    if (editingId && editingMessage.trim()) {
      updateMessageMutation.mutate({
        id: editingId,
        content: editingMessage.trim(),
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingMessage("");
  };

  const deleteMessage = (id: number) => {
    const messageToDelete = messages.find(msg => msg.id === id);
    console.log("Delete attempt details:", {
      messageId: id,
      messageOwnerId: messageToDelete?.userId,
      currentUserId: currentUser.id,
      currentUserName: `${currentUser.firstName} ${currentUser.lastName}`,
      currentUserEmail: currentUser.email,
      messageOwnerName: messageToDelete?.username,
      canDelete: messageToDelete?.userId === currentUser.id,
      isStrictlyEqual: messageToDelete?.userId === currentUser.id,
      messageOwnerIdType: typeof messageToDelete?.userId,
      currentUserIdType: typeof currentUser.id
    });

    if (!messageToDelete) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่พบข้อความที่ต้องการลบ",
        variant: "destructive",
      });
      return;
    }

    // ทำการตรวจสอบอย่างเข้มงวด
    if (messageToDelete.userId !== currentUser.id) {
      console.log("SECURITY CHECK FAILED:", {
        messageOwnerId: messageToDelete.userId,
        currentUserId: currentUser.id,
        equal: messageToDelete.userId === currentUser.id,
        strictEqual: messageToDelete.userId === currentUser.id
      });

      toast({
        title: "⚠️ ไม่อนุญาต",
        description: `คุณไม่สามารถลบข้อความของ ${messageToDelete.username} ได้! คุณสามารถลบได้เฉพาะข้อความของตัวเองเท่านั้น`,
        variant: "destructive",
      });
      return;
    }

    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อความนี้?\n\n"${messageToDelete.content}"\n\nการลบจะไม่สามารถกู้คืนได้`)) {
      console.log("User confirmed deletion of their own message:", id);
      deleteMessageMutation.mutate(id);
    }
  };

  const clearAttachments = () => {
    setSelectedFile(null);
    setSelectedGif(null);
  };

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ 
        backgroundColor: themeData?.currentTheme?.backgroundColor || '#f8fafc',
        color: themeData?.currentTheme?.textColor || '#1e293b'
      }}
    >
      {/* Header - สวยขึ้นและสูงกว่า */}
      <Card className="rounded-none border-x-0 border-t-0 shadow-lg">
        <CardHeader 
          className="py-4 sm:py-6 px-4 sm:px-8" 
          style={{ 
            background: `linear-gradient(135deg, ${themeData?.currentTheme?.primaryColor || '#3b82f6'}, ${themeData?.currentTheme?.secondaryColor || '#1e40af'})`,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            {/* Left side - Title ที่สวยขึ้น */}
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
            
            {/* Right side - Actions ที่มีระยะห่างดี */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* User profile - สวยขึ้น */}
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
              
              {/* Action buttons ที่สวยขึ้น */}
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
                onClick={() => {
                  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?")) {
                    localStorage.clear();
                    onSignOut();
                  }
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white hover:text-white flex-shrink-0 p-0 transition-all hover:scale-105 backdrop-blur-sm"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        </Card>

        {/* Messages Area */}
        <div className="flex-1 p-4 max-w-4xl mx-auto">
          <Card className="h-[calc(100vh-200px)] shadow-lg">
            <CardContent className="p-0 h-full flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">กำลังโหลดข้อความ...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <div className="text-4xl mb-2">💬</div>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      // Strict ownership check: same ID AND same email to prevent ID conflicts
                      const isOwnMessage = msg.userId === currentUser.id && 
                                         msg.username === `${currentUser.firstName} ${currentUser.lastName}`;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group`}
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
                                      Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                      Cancel
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
                                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                                          <div className="text-gray-600">📄</div>
                                          <span className="text-sm">{msg.attachmentName}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="text-sm leading-relaxed">
                                    {msg.content}
                                  </div>
                                </>
                              )}

                              {/* Message actions */}
                              {isOwnMessage && editingId !== msg.id && (
                                <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 bg-white shadow-md hover:bg-gray-50"
                                    onClick={() => startEdit(msg.id, msg.content)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 bg-white shadow-md hover:bg-gray-50 text-red-500 hover:text-red-600"
                                    onClick={() => deleteMessage(msg.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className={`mt-1 text-xs text-gray-500 ${isOwnMessage ? "text-right" : ""}`}>
                              {formatDistance(new Date(msg.createdAt), new Date(), { addSuffix: true })}
                               <span className="text-xs text-muted-foreground">
                                    {format(new Date(msg.createdAt), "h:mm a")}
                                    {msg.updatedAt && " (edited)"}
                                  </span>

                                  {/* Message actions below timestamp */}
                                  {isOwnMessage && editingId !== msg.id && (
                                    <div className="flex gap-2 mt-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                                        onClick={() => startEdit(msg.id, msg.content)}
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        แก้ไข
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800"
                                        onClick={() => deleteMessage(msg.id)}
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        ลบ
                                      </Button>
                                    </div>
                                  )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <Separator />

              {/* Attachment Preview */}
              {(selectedFile || selectedGif) && (
                <div className="p-3 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    {selectedFile && (
                      <div className="flex items-center gap-2">
                        <div className="text-blue-500">
                          {selectedFile.type.startsWith('image/') ? '🖼️' : '📄'}
                        </div>
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedFile.type.startsWith('image/') ? 'Image' : 'File'}
                        </Badge>
                      </div>
                    )}

                    {selectedGif && (
                      <div className="flex items-center gap-2">
                        <img src={selectedGif.url} alt={selectedGif.name} className="w-12 h-8 object-cover rounded" />
                        <span className="text-sm font-medium">{selectedGif.name}</span>
                        <Badge variant="secondary" className="text-xs">GIF</Badge>
                      </div>
                    )}

                    <Button size="sm" variant="ghost" onClick={clearAttachments}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 bg-white">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
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
                        disabled={createMessageMutation.isPending}
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
    );
  }