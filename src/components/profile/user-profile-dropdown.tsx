import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiKeyList } from "./api-key-list";
import { User, PerigonApiKey } from "@/lib/perigon-auth-service";

interface UserProfileDropdownProps {
  user: User;
  apiKeys: PerigonApiKey[];
  selectedKeyId: string | null;
  onKeySelect: (keyId: string) => void;
  onClose: () => void;
}

export function UserProfileDropdown({ 
  user, 
  apiKeys, 
  selectedKeyId, 
  onKeySelect, 
  onClose 
}: UserProfileDropdownProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
      />
      <Card className="absolute right-0 top-full mt-2 w-80 z-[9999] shadow-lg">
        <CardHeader className="pb-3">
          <a href="https://perigon.io/settings/account" target="_blank" rel="noopener noreferrer">
            <div className="flex items-center space-x-2">
              <UserAvatar user={user} />
              <div>
                <CardTitle className="text-sm">{user.email}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Perigon Account
                </p>
              </div>
            </div>
          </a>
        </CardHeader>

        <CardContent className="space-y-4">
          <ApiKeyList
            apiKeys={apiKeys}
            selectedKeyId={selectedKeyId}
            onKeySelect={onKeySelect}
          />
        </CardContent>
      </Card>
    </>
  );
}