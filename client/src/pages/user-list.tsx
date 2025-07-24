import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import { Users, Search, ArrowLeft, MessageCircle } from "lucide-react";

interface UserListPageProps {
  currentUser: User;
}

export function UserListPage({ currentUser }: UserListPageProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all users
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
  });

  const getInitials = (firstName: string = "U", lastName: string = "N") => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.firstName || "").toLowerCase().includes(searchLower) ||
      (user.lastName || "").toLowerCase().includes(searchLower) ||
      (user.username || "").toLowerCase().includes(searchLower) ||
      (user.email || "").toLowerCase().includes(searchLower)
    );
  });

  const handleViewProfile = (userId: number) => {
    setLocation(`/profile/${userId}`);
  };

  const handleStartChat = (userId: number) => {
    // For now, just redirect to chat. In the future, this could open a DM
    setLocation("/chat");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดรายชื่อผู้ใช้...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-gray-600 mb-4">ไม่สามารถโหลดรายชื่อผู้ใช้ได้</p>
            <Button onClick={() => setLocation("/chat")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับไปแชท
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/chat")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับไปแชท
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              รายชื่อผู้ใช้งาน
            </h1>
          </div>
          
          <Badge variant="secondary">
            {filteredUsers.length} ผู้ใช้
          </Badge>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาผู้ใช้งาน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">ไม่พบผู้ใช้งาน</h3>
              <p className="text-gray-600">ลองค้นหาด้วยคำอื่น</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 bg-white border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-blue-100">
                        {user.avatar ? (
                          <AvatarImage src={user.avatar} alt={user.firstName} />
                        ) : null}
                        <AvatarFallback className="bg-blue-500 text-white font-semibold">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                    {user.id === currentUser.id && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        คุณ
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">📧 อีเมล</p>
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    </div>
                    
                    {user.bio && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">💭 เกี่ยวกับ</p>
                        <p className="text-sm text-gray-900 line-clamp-2">{user.bio}</p>
                      </div>
                    )}
                    
                    {user.location && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">📍 ที่อยู่</p>
                        <p className="text-sm text-gray-900">{user.location}</p>
                      </div>
                    )}
                    
                    {user.website && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">🌐 เว็บไซต์</p>
                        <a 
                          href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {user.website}
                        </a>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-2">📅 เข้าร่วมเมื่อ</p>
                      <p className="text-xs text-gray-700">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'ไม่ทราบ'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewProfile(user.id)}
                      className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      ดูโปรไฟล์
                    </Button>
                    
                    {user.id !== currentUser.id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleStartChat(user.id)}
                        className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        แชท
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}