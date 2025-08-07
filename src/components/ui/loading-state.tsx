import { UserAvatar } from "./user-avatar";
import { User } from "@/lib/perigon-auth-service";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  user?: User | null;
  message: string;
  className?: string;
  showAvatar?: boolean;
}

export function LoadingState({ 
  user, 
  message, 
  className,
  showAvatar = true 
}: LoadingStateProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {showAvatar && (
        <div className="animate-pulse">
          <UserAvatar user={user || null} showFallback={true} />
        </div>
      )}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {message}
      </span>
    </div>
  );
}