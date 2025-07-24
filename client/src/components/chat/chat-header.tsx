import { Settings, LogOut, Users, User, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import ThemeSelector from "@/components/ThemeSelector";

interface ChatHeaderProps {
  currentUser: {
    id: number;
    username: string;
    initials: string;
  };
  onlineUsers: number;
  onSignOut: () => void;
}

export default function ChatHeader({ currentUser, onlineUsers, onSignOut }: ChatHeaderProps) {
  const [, setLocation] = useLocation();
  return (
    <header className="bg-primary text-white px-1 sm:px-3 py-1.5 sm:py-2 shadow-material-2 relative z-10 overflow-hidden">
      <div className="flex items-center justify-between w-full min-w-0 gap-1">
        {/* Left side - Title and user count - มินิไมซ์ */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink min-w-0 flex-1">
          <div className="w-5 h-5 sm:w-7 sm:h-7 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
            <i className="fas fa-comments text-white text-xs"></i>
          </div>
          <div className="min-w-0 overflow-hidden">
            <h1 className="text-xs sm:text-base font-medium truncate">Chat</h1>
            <p className="text-blue-100 text-xs hidden md:block">
              {onlineUsers} online
            </p>
          </div>
        </div>
        
        {/* Right side - Actions ขนาดมินิ */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Theme selector - มินิ */}
          <div className="flex-shrink-0">
            <ThemeSelector />
          </div>
          
          {/* Action buttons - มินิ */}
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 text-white hover:text-white flex-shrink-0"
            onClick={() => setLocation("/users")}
            title="ดูผู้คน"
          >
            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 text-white hover:text-white flex-shrink-0"
            onClick={() => setLocation("/profile")}
            title="โปรไฟล์"
          >
            <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 text-white hover:text-white flex-shrink-0"
            onClick={onSignOut}
            title="ออก"
          >
            <LogOut className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </Button>
        </div>
      </div>
    </header>
  );
}
