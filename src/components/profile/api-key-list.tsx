import { Badge } from "@/components/ui/badge";
import { ApiKeyItem } from "./api-key-item";
import { PerigonApiKey } from "@/lib/perigon-auth-service";

interface ApiKeyListProps {
  apiKeys: PerigonApiKey[];
  selectedKeyId: string | null;
  onKeySelect: (keyId: string) => void;
}

export function ApiKeyList({ apiKeys, selectedKeyId, onKeySelect }: ApiKeyListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">API Keys</h4>
        <Badge variant="outline" className="text-xs">
          {apiKeys.length} available
        </Badge>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {apiKeys.map((apiKey) => (
          <ApiKeyItem
            key={apiKey.id}
            apiKey={apiKey}
            isSelected={selectedKeyId === apiKey.id}
            onSelect={onKeySelect}
          />
        ))}
      </div>
    </div>
  );
}