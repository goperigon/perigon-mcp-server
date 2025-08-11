import { Badge } from "@/components/ui/badge";
import { Key, Check, Calendar } from "lucide-react";
import { PerigonApiKey } from "@/lib/perigon-auth-service";
import { cn } from "@/lib/utils";

interface ApiKeyItemProps {
  apiKey: PerigonApiKey;
  isSelected: boolean;
  onSelect: (keyId: string) => void;
}

export function ApiKeyItem({ apiKey, isSelected, onSelect }: ApiKeyItemProps) {
  return (
    <div
      className={cn(
        "p-2 rounded-lg border cursor-pointer transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      )}
      onClick={() => onSelect(apiKey.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Key className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm font-medium truncate">
              {apiKey.name || "Unnamed Key"}
            </span>
            {isSelected && (
              <Check className="w-3 h-3 text-primary" />
            )}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {new Date(apiKey.createdAt).toLocaleDateString()}
            </span>
            <Badge
              variant={apiKey.enabled ? "outline" : "secondary"}
              className="text-xs"
            >
              {apiKey.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}