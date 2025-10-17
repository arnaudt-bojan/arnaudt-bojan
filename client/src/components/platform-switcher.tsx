import { useBusinessMode, BusinessMode } from "@/contexts/business-mode-context";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, Users, FileText } from "lucide-react";

const platformOptions = [
  {
    value: 'b2c' as BusinessMode,
    label: 'Retail (B2C)',
    icon: Store,
    dashboard: '/seller-dashboard',
  },
  {
    value: 'b2b' as BusinessMode,
    label: 'Wholesale (B2B)',
    icon: Users,
    dashboard: '/wholesale/dashboard',
  },
  {
    value: 'trade' as BusinessMode,
    label: 'Trade (Professional)',
    icon: FileText,
    dashboard: '/seller/trade/dashboard',
  },
];

export function PlatformSwitcher() {
  const { mode, setMode } = useBusinessMode();
  const [, setLocation] = useLocation();

  const handlePlatformChange = (newMode: string) => {
    const platform = platformOptions.find(p => p.value === newMode);
    if (platform) {
      setMode(platform.value);
      setLocation(platform.dashboard);
    }
  };

  const currentPlatform = platformOptions.find(p => p.value === mode);

  return (
    <Select value={mode} onValueChange={handlePlatformChange}>
      <SelectTrigger 
        className="w-full" 
        data-testid="select-platform-switcher"
      >
        <div className="flex items-center gap-2">
          {currentPlatform && (
            <>
              <currentPlatform.icon className="h-4 w-4" />
              <span>{currentPlatform.label}</span>
            </>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {platformOptions.map((platform) => {
          const Icon = platform.icon;
          return (
            <SelectItem 
              key={platform.value} 
              value={platform.value}
              data-testid={`option-platform-${platform.value}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{platform.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
