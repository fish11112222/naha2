import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import ChatHeader from "@/components/chat/chat-header";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import EditMessageModal from "@/components/chat/edit-message-modal";
import DeleteMessageModal from "@/components/chat/delete-message-modal";
import type { Message, InsertMessage, UpdateMessage, User } from "@shared/schema";

interface ChatProps {
  currentUser: User;
  onSignOut: () => void;
}

export default function Chat({ currentUser, onSignOut }: ChatProps) {
  const { toast } = useToast();
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);

  // Fetch messages
  const { data: messages = [], isLoading, error } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
  });

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (messageData: InsertMessage) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "ส่งข้อความสำเร็จ",
        description: "ข้อความของคุณถูกส่งเรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    },
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const response = await apiRequest("PUT", `/api/message-actions?id=${id}&action=update`, {
        content,
        userId: currentUser.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setEditingMessage(null);
      toast({
        title: "แก้ไขข้อความสำเร็จ",
        description: "ข้อความของคุณถูกแก้ไขเรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      console.error('Update message error:', error);
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
      // Use new API endpoint with query parameters
      const response = await fetch(`/api/message-actions?id=${id}&action=delete&userId=${currentUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

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

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setDeletingMessage(null);
      toast({
        title: "ลบข้อความสำเร็จ",
        description: "ข้อความของคุณถูกลบเรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      console.error('Delete message error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบข้อความได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (content: string) => {
    createMessageMutation.mutate({
      content,
      username: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.id,
    });
  };

  const handleEditMessage = (content: string) => {
    if (editingMessage) {
      updateMessageMutation.mutate({
        id: editingMessage.id,
        content,
      });
    }
  };

  const handleDeleteMessage = () => {
    if (deletingMessage) {
      deleteMessageMutation.mutate(deletingMessage.id);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <h2 className="text-xl font-medium text-on-surface mb-2">Connection Error</h2>
          <p className="text-on-surface-variant">Failed to connect to chat server.</p>
        </div>
      </div>
    );
  }

  const userForDisplay = {
    id: currentUser.id,
    username: `${currentUser.firstName} ${currentUser.lastName}`,
    initials: `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase(),
  };

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto bg-white shadow-material-2">
      <ChatHeader currentUser={userForDisplay} onlineUsers={24} onSignOut={onSignOut} />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="bg-accent text-white px-4 py-2 text-center text-sm">
          <i className="fas fa-wifi mr-2"></i>
          Connected - Real-time updates enabled
        </div>
        
        <MessageList
          messages={messages}
          currentUser={userForDisplay}
          isLoading={isLoading}
          onEditMessage={setEditingMessage}
          onDeleteMessage={setDeletingMessage}
        />
      </main>

      <MessageInput
        onSendMessage={handleSendMessage}
        isLoading={createMessageMutation.isPending}
      />

      <EditMessageModal
        message={editingMessage}
        isOpen={!!editingMessage}
        onClose={() => setEditingMessage(null)}
        onSave={handleEditMessage}
        isLoading={updateMessageMutation.isPending}
      />

      <DeleteMessageModal
        isOpen={!!deletingMessage}
        onClose={() => setDeletingMessage(null)}
        onConfirm={handleDeleteMessage}
        isLoading={deleteMessageMutation.isPending}
      />
    </div>
  );
}
