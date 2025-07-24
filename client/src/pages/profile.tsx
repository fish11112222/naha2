import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, UpdateProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Globe, Edit, Save, X, Upload, User as UserIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface ProfilePageProps {
  currentUser: User;
  onSignOut: () => void;
}

export function ProfilePage({ currentUser, onSignOut }: ProfilePageProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const profileUserId = id ? parseInt(id) : currentUser.id;
  const isOwnProfile = profileUserId === currentUser.id;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateProfile>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // Fetch user profile
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/users', profileUserId, 'profile'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${profileUserId}/profile`);
      return response.json();
    },
  });

  // Note: Message count endpoint not yet implemented in consolidated API
  const messageCount = { count: 0 };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const response = await apiRequest("PUT", `/api/users/${profileUserId}/profile`, data);
      return response.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(['/api/users', profileUserId, 'profile'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['/api/users', profileUserId] });
      setIsEditing(false);
      setEditData({});
      setAvatarFile(null);
      setAvatarPreview("");
      toast({
        title: "สำเร็จ!",
        description: "อัปเดตโปรไฟล์เรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถอัปเดตโปรไฟล์ได้",
        variant: "destructive",
      });
    },
  });

  // Compress image function
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Set max dimensions
        const maxWidth = 400;
        const maxHeight = 400;
        
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
        resolve(compressedDataUrl);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle avatar upload
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for original file
        toast({
          title: "ไฟล์ใหญ่เกินไป",
          description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const compressedImage = await compressImage(file);
        setAvatarFile(file);
        setAvatarPreview(compressedImage);
        setEditData(prev => ({ ...prev, avatar: compressedImage }));
        
        toast({
          title: "สำเร็จ!",
          description: "โหลดรูปภาพเรียบร้อยแล้ว",
        });
      } catch (error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดรูปภาพได้",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = () => {
    if (!user) return;
    setIsEditing(true);
    setEditData({
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
      dateOfBirth: user.dateOfBirth ? format(new Date(user.dateOfBirth), "yyyy-MM-dd") : "",
    });
  };

  const handleSave = () => {
    // Validate data before sending
    if (!editData.firstName?.trim() || !editData.lastName?.trim()) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อและนามสกุล",
        variant: "destructive",
      });
      return;
    }

    // Check avatar size
    if (editData.avatar && editData.avatar.length > 1000000) { // ~1MB for base64
      toast({
        title: "รูปภาพใหญ่เกินไป",
        description: "กรุณาเลือกรูปภาพที่เล็กกว่า",
        variant: "destructive",
      });
      return;
    }

    console.log("Saving profile data:", {
      ...editData,
      avatar: editData.avatar ? `[${editData.avatar.length} characters]` : undefined
    });
    
    updateProfileMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
    setAvatarFile(null);
    setAvatarPreview("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">ไม่พบผู้ใช้งาน</h3>
            <p className="text-gray-600 mb-4">ไม่สามารถหาผู้ใช้งานที่คุณต้องการได้</p>
            <Button onClick={() => setLocation("/chat")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับไปแชท
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return "ไม่ระบุ";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "ไม่ระบุ";
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

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
              {isOwnProfile ? "โปรไฟล์ของฉัน" : `โปรไฟล์ของ ${user.firstName} ${user.lastName}`}
            </h1>
          </div>
          
          {isOwnProfile && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    บันทึก
                  </Button>
                  <Button 
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    ยกเลิก
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  แก้ไขโปรไฟล์
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center md:items-start">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage 
                      src={avatarPreview || user.avatar || ""} 
                      alt={`${user.firstName} ${user.lastName}`}
                    />
                    <AvatarFallback className="text-2xl">
                      {getInitials(user.firstName, user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isEditing && (
                    <div className="mt-4">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                          <Upload className="h-4 w-4" />
                          เปลี่ยนรูปโปรไฟล์
                        </div>
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
                
                {/* Online Status */}
                <div className="flex items-center gap-2 mt-4">
                  <div className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {user.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                  </span>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                {/* Name */}
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          value={editData.firstName || ""}
                          onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="ชื่อจริง"
                          className="text-xl"
                        />
                        <Input
                          value={editData.lastName || ""}
                          onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="นามสกุล"
                          className="text-xl"
                        />
                      </div>
                    ) : (
                      `${user.firstName} ${user.lastName}`
                    )}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
                </div>

                {/* Bio */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    เกี่ยวกับฉัน
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.bio || ""}
                      onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="เขียนเกี่ยวกับตัวเอง..."
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {user.bio || "ยังไม่ได้เขียนเกี่ยวกับตัวเอง"}
                    </p>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Location */}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">ที่อยู่</Label>
                      {isEditing ? (
                        <Input
                          value={editData.location || ""}
                          onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="ที่อยู่"
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm">{user.location || "ไม่ระบุ"}</p>
                      )}
                    </div>
                  </div>

                  {/* Website */}
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">เว็บไซต์</Label>
                      {isEditing ? (
                        <Input
                          value={editData.website || ""}
                          onChange={(e) => setEditData(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://example.com"
                          className="text-sm"
                        />
                      ) : (
                        user.website ? (
                          <a 
                            href={user.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {user.website}
                          </a>
                        ) : (
                          <p className="text-sm">ไม่ระบุ</p>
                        )
                      )}
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">วันเกิด</Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editData.dateOfBirth || ""}
                          onChange={(e) => setEditData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm">{formatDate(user.dateOfBirth)}</p>
                      )}
                    </div>
                  </div>

                  {/* Join Date */}
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">เข้าร่วมเมื่อ</Label>
                      <p className="text-sm">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Statistics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>สถิติ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">วันที่ใช้งาน</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {messageCount?.count || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">ข้อความทั้งหมด</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${user.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                  {user.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">สถานะ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {user.lastActivity ? format(new Date(user.lastActivity), "dd/MM") : "ไม่ทราบ"}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">ครั้งล่าสุด</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ข้อมูลติดต่อ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">อีเมล</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              
              {user.location && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">ที่อยู่</p>
                    <p className="font-medium">{user.location}</p>
                  </div>
                </div>
              )}
              
              {user.website && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">เว็บไซต์</p>
                    <a 
                      href={user.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {user.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Actions for Own Profile */}
        {isOwnProfile && (
          <Card>
            <CardHeader>
              <CardTitle>การตั้งค่าบัญชี</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">ดูโปรไฟล์สาธารณะ</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ดูว่าผู้อื่นเห็นโปรไฟล์คุณอย่างไร
                    </p>
                  </div>
                  <Button 
                    onClick={() => setLocation(`/profile/${user.id}`)} 
                    variant="outline"
                  >
                    ดูโปรไฟล์
                  </Button>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-red-600">ออกจากระบบ</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ออกจากบัญชีปัจจุบันและกลับไปหน้าเข้าสู่ระบบ
                    </p>
                  </div>
                  <Button onClick={onSignOut} variant="destructive">
                    ออกจากระบบ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}