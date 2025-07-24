import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Palette, Check, Search, Image, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatTheme } from "@shared/schema";

// Predefined themes
const defaultThemes = [
  {
    id: 1,
    name: "Classic Blue",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af", 
    backgroundColor: "#f8fafc",
    messageBackgroundSelf: "#3b82f6",
    messageBackgroundOther: "#e2e8f0",
    textColor: "#1e293b"
  },
  {
    id: 2,
    name: "Sunset Orange",
    primaryColor: "#f59e0b",
    secondaryColor: "#d97706",
    backgroundColor: "#fef3c7",
    messageBackgroundSelf: "#f59e0b",
    messageBackgroundOther: "#fed7aa",
    textColor: "#92400e"
  },
  {
    id: 3,
    name: "Forest Green",
    primaryColor: "#10b981",
    secondaryColor: "#059669",
    backgroundColor: "#ecfdf5",
    messageBackgroundSelf: "#10b981",
    messageBackgroundOther: "#d1fae5",
    textColor: "#064e3b"
  },
  {
    id: 4,
    name: "Purple Dreams",
    primaryColor: "#8b5cf6",
    secondaryColor: "#7c3aed",
    backgroundColor: "#f3f4f6",
    messageBackgroundSelf: "#8b5cf6",
    messageBackgroundOther: "#e5e7eb",
    textColor: "#374151"
  },
  {
    id: 5,
    name: "Rose Gold",
    primaryColor: "#f43f5e",
    secondaryColor: "#e11d48",
    backgroundColor: "#fdf2f8",
    messageBackgroundSelf: "#f43f5e",
    messageBackgroundOther: "#fce7f3",
    textColor: "#881337"
  },
  {
    id: 6,
    name: "Dark Mode",
    primaryColor: "#6366f1",
    secondaryColor: "#4f46e5",
    backgroundColor: "#111827",
    messageBackgroundSelf: "#6366f1",
    messageBackgroundOther: "#374151",
    textColor: "#f9fafb"
  }
];

interface UnsplashPhoto {
  id: string;
  urls: {
    thumb: string;
    small: string;
    regular: string;
    full: string;
  };
  user: {
    name: string;
    username: string;
  };
  description?: string;
  alt_description?: string;
}

interface ThemeSelectorProps {
  currentTheme?: ChatTheme;
  onThemeChange?: (theme: ChatTheme) => void;
}

export default function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<UnsplashPhoto | null>(null);
  const [customThemeName, setCustomThemeName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch images from Unsplash API with proper search
  const { data: images, isLoading: imagesLoading } = useQuery<UnsplashPhoto[]>({
    queryKey: ['images-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      
      try {
        // Try Unsplash API first with demo access
        const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12&client_id=demo`;
        const response = await fetch(unsplashUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            return data.results.map((photo: any) => ({
              id: photo.id,
              urls: {
                thumb: photo.urls.thumb,
                small: photo.urls.small,
                regular: photo.urls.regular,
                full: photo.urls.full
              },
              user: {
                name: photo.user.name,
                username: photo.user.username
              },
              description: photo.description || photo.alt_description,
              alt_description: photo.alt_description
            }));
          }
        }
      } catch (error) {
        console.log('Unsplash API unavailable, using fallback');
      }
      
      // Enhanced fallback with better search mapping
      const searchTerms = searchQuery.toLowerCase();
      let searchCategory = searchQuery;
      let seedBase = searchQuery.replace(/\s+/g, '-').toLowerCase();
      
      // Better mapping for Thai and English terms
      if (searchTerms.includes('mountain') || searchTerms.includes('เขา') || searchTerms.includes('ภูเขา')) {
        searchCategory = 'mountain';
        seedBase = 'mountain';
      } else if (searchTerms.includes('beach') || searchTerms.includes('หาด') || searchTerms.includes('ทะเล')) {
        searchCategory = 'beach';
        seedBase = 'ocean';
      } else if (searchTerms.includes('city') || searchTerms.includes('เมือง') || searchTerms.includes('ตึก')) {
        searchCategory = 'city';
        seedBase = 'urban';
      } else if (searchTerms.includes('forest') || searchTerms.includes('ป่า') || searchTerms.includes('ต้นไม้')) {
        searchCategory = 'forest';
        seedBase = 'trees';
      } else if (searchTerms.includes('flower') || searchTerms.includes('ดอกไม้') || searchTerms.includes('สวน')) {
        searchCategory = 'flowers';
        seedBase = 'garden';
      } else if (searchTerms.includes('space') || searchTerms.includes('อวกาศ') || searchTerms.includes('ดาว')) {
        searchCategory = 'space';
        seedBase = 'cosmos';
      } else if (searchTerms.includes('abstract') || searchTerms.includes('นามธรรม') || searchTerms.includes('ศิลปะ')) {
        searchCategory = 'abstract';
        seedBase = 'art';
      } else if (searchTerms.includes('food') || searchTerms.includes('อาหาร') || searchTerms.includes('กิน')) {
        searchCategory = 'food';
        seedBase = 'cuisine';
      } else if (searchTerms.includes('animal') || searchTerms.includes('สัตว์') || searchTerms.includes('หมา') || searchTerms.includes('แมว')) {
        searchCategory = 'animals';
        seedBase = 'pets';
      } else if (searchTerms.includes('chinjung') || searchTerms.includes('china') || searchTerms.includes('chinese') || searchTerms.includes('จีน')) {
        searchCategory = 'Chinese architecture';
        seedBase = 'chinese-temple';
      } else if (searchTerms.includes('temple') || searchTerms.includes('วัด') || searchTerms.includes('โบราณ')) {
        searchCategory = 'temple';
        seedBase = 'ancient-temple';
      } else if (searchTerms.includes('architecture') || searchTerms.includes('สถาปัตยกรรม') || searchTerms.includes('อาคาร')) {
        searchCategory = 'architecture';
        seedBase = 'building';
      }
      
      // Generate themed images based on search
      return Array.from({ length: 12 }, (_, i) => ({
        id: `themed-${seedBase}-${i}`,
        urls: {
          thumb: `https://picsum.photos/seed/${seedBase}-bg-${i}/200/150`,
          small: `https://picsum.photos/seed/${seedBase}-bg-${i}/400/300`,
          regular: `https://picsum.photos/seed/${seedBase}-bg-${i}/800/600`,
          full: `https://picsum.photos/seed/${seedBase}-bg-${i}/1200/800`
        },
        user: { name: 'Theme Creator', username: 'theme' },
        description: `${searchCategory} themed background`,
        alt_description: `${searchQuery} wallpaper for chat theme`
      }));
    },
    enabled: !!searchQuery && searchQuery.length > 2
  });

  // Get current active theme
  const { data: themeData } = useQuery<{ currentTheme: any; availableThemes: any[] }>({
    queryKey: ['/api/theme'],
    retry: false,
  });

  // Change theme mutation  
  const changeThemeMutation = useMutation({
    mutationFn: async (themeId: number | string) => {
      const response = await apiRequest("POST", "/api/theme", { themeId });
      return response.json();
    },
    onSuccess: (data) => {
      const theme = data.currentTheme;
      toast({
        title: "เปลี่ยนธีมสำเร็จ!",
        description: `เปลี่ยนเป็นธีม ${theme.name} แล้ว`,
      });
      
      // Apply theme immediately to CSS variables with new format
      const root = document.documentElement;
      root.style.setProperty('--chat-primary', theme.colors?.primary || theme.primaryColor || '#3b82f6');
      root.style.setProperty('--chat-secondary', theme.colors?.secondary || theme.secondaryColor || '#1e40af');
      root.style.setProperty('--chat-background', theme.colors?.background || theme.backgroundColor || '#f8fafc');
      root.style.setProperty('--chat-message-self', theme.colors?.primary || theme.messageBackgroundSelf || '#3b82f6');
      root.style.setProperty('--chat-message-other', theme.colors?.border || theme.messageBackgroundOther || '#e2e8f0');
      root.style.setProperty('--chat-text', theme.colors?.text || theme.textColor || '#1e293b');
      
      // Update body background
      document.body.style.backgroundColor = theme.colors?.background || theme.backgroundColor || '#f8fafc';
      
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/theme'] });
      
      if (onThemeChange) {
        onThemeChange(theme);
      }
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถเปลี่ยนธีมได้",
        variant: "destructive",
      });
    },
  });

  const applyThemeToCSS = (theme: ChatTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--chat-primary', theme.primaryColor);
    root.style.setProperty('--chat-secondary', theme.secondaryColor);
    root.style.setProperty('--chat-background', theme.backgroundColor);
    root.style.setProperty('--chat-message-self', theme.messageBackgroundSelf);
    root.style.setProperty('--chat-message-other', theme.messageBackgroundOther);
    root.style.setProperty('--chat-text', theme.textColor);
    
    // Update body background
    document.body.style.backgroundColor = theme.backgroundColor;
  };

  const handleThemeSelect = (theme: typeof defaultThemes[0]) => {
    // For default themes, use the numeric ID. For new API themes, use string ID
    const themeId = typeof theme.id === 'string' ? theme.id : theme.id;
    changeThemeMutation.mutate(themeId);
  };

  // Create custom theme function
  const handleCreateCustomTheme = async () => {
    if (!selectedImage || !customThemeName.trim()) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณาเลือกรูปภาพและกรอกชื่อธีม",
        variant: "destructive",
      });
      return;
    }

    try {
      // Apply the theme immediately
      const root = document.documentElement;
      root.style.setProperty('--chat-primary', "#3b82f6");
      root.style.setProperty('--chat-secondary', "#1e40af");
      root.style.setProperty('--chat-background', "#f8fafc");
      root.style.setProperty('--chat-message-self', "#3b82f6");
      root.style.setProperty('--chat-message-other', "rgba(255, 255, 255, 0.9)");
      root.style.setProperty('--chat-text', "#1e293b");
      
      // Set background image
      document.body.style.backgroundImage = `url(${selectedImage.urls.regular})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';

      toast({
        title: "ธีมถูกสร้างแล้ว!",
        description: `ธีม "${customThemeName}" ถูกนำไปใช้แล้ว`,
      });

      // Close dialog and reset
      setIsImageDialogOpen(false);
      setSelectedImage(null);
      setCustomThemeName("");
      setSearchQuery("");

    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างธีมได้",
        variant: "destructive",
      });
    }
  };

  const activeTheme = themeData?.currentTheme;
  const availableThemes = themeData?.availableThemes || defaultThemes;
  const currentActiveThemeId = activeTheme?.id || currentTheme?.id || 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-white bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 backdrop-blur-sm border-0"
        >
          <Palette className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <h3 className="font-medium text-center">Choose Chat Theme</h3>
          <p className="text-xs text-gray-500 text-center">Everyone will see the new theme</p>
          
          <div className="grid grid-cols-2 gap-3">
            {availableThemes.map((theme) => (
              <div
                key={theme.id}
                className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:scale-105 ${
                  currentActiveThemeId === theme.id 
                    ? 'border-blue-500 ring-2 ring-blue-200' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleThemeSelect(theme)}
              >
                {currentActiveThemeId === theme.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="font-medium text-sm">{theme.name}</div>
                  
                  {/* Theme preview */}
                  <div 
                    className="h-16 rounded p-2 text-xs"
                    style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
                  >
                    <div 
                      className="inline-block px-2 py-1 rounded mb-1 text-white text-[10px]"
                      style={{ backgroundColor: theme.messageBackgroundSelf }}
                    >
                      Your message
                    </div>
                    <div 
                      className="inline-block px-2 py-1 rounded text-[10px] ml-2"
                      style={{ 
                        backgroundColor: theme.messageBackgroundOther, 
                        color: theme.textColor 
                      }}
                    >
                      Other message
                    </div>
                  </div>
                  
                  {/* Color palette */}
                  <div className="flex gap-1">
                    <div 
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: theme.secondaryColor }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: theme.messageBackgroundSelf }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Custom theme with image search */}
          <div className="border-t pt-4">
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างธีมด้วยรูปภาพ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>สร้างธีมใหม่ด้วยรูปภาพ</DialogTitle>
                  <DialogDescription>
                    ค้นหารูปภาพและสร้างธีมแชทของคุณเอง
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Theme name input */}
                  <div>
                    <label className="text-sm font-medium">ชื่อธีม</label>
                    <Input
                      placeholder="กรอกชื่อธีมของคุณ..."
                      value={customThemeName}
                      onChange={(e) => setCustomThemeName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Image search */}
                  <div>
                    <label className="text-sm font-medium">ค้นหารูปภาพพื้นหลัง</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="ค้นหา เช่น mountain, beach, city, chinjung..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            setSearchQuery(e.currentTarget.value + ' ');
                          }
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setSearchQuery(searchQuery + " ")}
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Image results */}
                  {searchQuery && searchQuery.length > 2 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">เลือกรูปภาพ</h4>
                      {imagesLoading ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {images?.map((image) => (
                            <div
                              key={image.id}
                              className={`aspect-video rounded-lg cursor-pointer transition-all hover:scale-105 border-2 ${
                                selectedImage?.id === image.id
                                  ? 'border-blue-500 ring-2 ring-blue-200'
                                  : 'border-transparent hover:border-gray-300'
                              }`}
                              onClick={() => setSelectedImage(image)}
                            >
                              <img
                                src={image.urls.thumb}
                                alt={image.alt_description || 'Background image'}
                                className="w-full h-full object-cover rounded-lg"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected image preview */}
                  {selectedImage && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="text-sm font-medium mb-2">ตัวอย่างธีม</h4>
                      <div 
                        className="h-32 rounded-lg p-4 relative overflow-hidden"
                        style={{
                          backgroundImage: `url(${selectedImage.urls.small})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                        <div className="relative z-10 space-y-2">
                          <div className="inline-block bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">
                            ข้อความของคุณ
                          </div>
                          <div className="inline-block bg-white bg-opacity-90 text-gray-800 px-3 py-1 rounded-lg text-sm ml-4">
                            ข้อความของคนอื่น
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <div className="text-xs text-gray-600">
                          รูปโดย {selectedImage.user.name}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={handleCreateCustomTheme}
                          disabled={!customThemeName.trim()}
                        >
                          สร้างธีม
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {changeThemeMutation.isPending && (
            <div className="text-center text-sm text-gray-500">
              Changing theme...
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}