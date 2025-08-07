import { User as UserIcon } from "lucide-react";
import { User } from "@/lib/perigon-auth-service";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user: User | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8",
};

const iconSizeClasses = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export function UserAvatar({ 
  user, 
  size = "md", 
  className,
  showFallback = true 
}: UserAvatarProps) {
  return (
    <div className={cn(
      "rounded-full flex items-center justify-center overflow-hidden",
      sizeClasses[size],
      className
    )}>
      {user?.imageUrl ? (
        <img
          src={user.imageUrl}
          alt={user.name || user.email || "User avatar"}
          className="w-full h-full object-cover rounded-full"
        />
      ) : showFallback ? (
        <div className="w-full h-full bg-muted rounded-full flex items-center justify-center">
          <UserIcon className={cn("text-muted-foreground", iconSizeClasses[size])} />
        </div>
      ) : null}
    </div>
  );
}