import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useApiKeys } from "@/lib/api-keys-context";
import { SignInButton } from "@/components/ui/sign-in-button";
import { LoadingState } from "@/components/ui/loading-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserProfileDropdown } from "@/components/profile/user-profile-dropdown";

export default function ApiKeySelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { authCheckStatus, user, ensureAuthenticated } = useAuth();
  const {
    availablePerigonKeys,
    selectedPerigonKeyId,
    setSelectedPerigonKeyId,
    isUsingPerigonAuth,
    isLoadingApiKeys,
    ensureApiKeysLoaded,
  } = useApiKeys();

  // Show sign in button when auth is idle or background checking
  if (authCheckStatus === "idle" || authCheckStatus === "background-checking") {
    return (
      <SignInButton
        user={user}
        isBackgroundChecking={authCheckStatus === "background-checking"}
        onClick={async () => {
          await ensureAuthenticated();
        }}
      />
    );
  }

  // Show loading state during user-triggered auth check
  if (authCheckStatus === "checking") {
    return <LoadingState user={user} message="Signing In..." />;
  }

  // Don't show if not authenticated or no user
  if (authCheckStatus !== "authenticated" || !user) {
    return null;
  }

  // Show loading state while fetching API keys
  if (isLoadingApiKeys) {
    return <LoadingState user={user} message="Loading..." className="z-50" />;
  }

  // Don't show if not using Perigon auth or no keys available
  if (!isUsingPerigonAuth || availablePerigonKeys.length === 0) {
    return null;
  }

  const handleKeySelect = (keyId: string) => {
    setSelectedPerigonKeyId(keyId);
    setIsOpen(false);
  };

  const handleDropdownToggle = async () => {
    if (!isOpen) {
      // Ensure API keys are loaded when opening dropdown
      await ensureApiKeysLoaded();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDropdownToggle}
        className="h-8 px-2 flex items-center space-x-2"
      >
        <UserAvatar user={user} />
        <span className="text-xs hidden sm:inline">{user.email}</span>
        <ChevronDown className="w-3 h-3" />
      </Button>

      {isOpen && (
        <UserProfileDropdown
          user={user}
          apiKeys={availablePerigonKeys}
          selectedKeyId={selectedPerigonKeyId}
          onKeySelect={handleKeySelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}


