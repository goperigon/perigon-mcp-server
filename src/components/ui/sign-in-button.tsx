import { Button } from "@/components/ui/button";
import { UserAvatar } from "./user-avatar";
import { User } from "@/lib/perigon-auth-service";

interface SignInButtonProps {
  user: User | null;
  isBackgroundChecking: boolean;
  onClick: () => void;
}

export function SignInButton({ user, isBackgroundChecking, onClick }: SignInButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-8 px-2 flex items-center space-x-2"
      disabled={isBackgroundChecking}
    >
      <UserAvatar user={user} />
      <span className="text-xs hidden sm:inline">
        {isBackgroundChecking ? "Checking..." : "Sign In"}
      </span>
    </Button>
  );
}