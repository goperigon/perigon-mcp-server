
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Settings, AlertCircle, Check } from "lucide-react";
import { useApiKeys } from "@/lib/api-keys-context";

interface ApiKeysStatusProps {
  onOpenSettings: () => void;
}

export default function ApiKeysStatus({ onOpenSettings }: ApiKeysStatusProps) {
  const { hasValidKeys, isPerigonKeyValid, isAnthropicKeyValid } = useApiKeys();

  const getStatusColor = () => {
    if (hasValidKeys()) return "text-green-600";
    if (isPerigonKeyValid || isAnthropicKeyValid) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = () => {
    if (hasValidKeys()) return <Check className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (hasValidKeys()) return "API Keys Configured";
    if (isPerigonKeyValid && !isAnthropicKeyValid) return "Anthropic Key Missing";
    if (!isPerigonKeyValid && isAnthropicKeyValid) return "Perigon Key Missing";
    return "API Keys Required";
  };

  return (
    <div className="flex items-center space-x-2">
      <Badge 
        variant="outline" 
        className={`${getStatusColor()} border-current`}
      >
        {getStatusIcon()}
        <span className="ml-1 text-xs">{getStatusText()}</span>
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenSettings}
        className="h-8 px-2"
        title="Configure API Keys"
      >
        <Key className="w-4 h-4" />
        <Settings className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}