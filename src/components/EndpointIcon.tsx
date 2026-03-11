import {
  Smartphone,
  Fingerprint,
  Receipt,
  Send,
  Landmark,
  Wheat,
  Wallet,
  CreditCard,
  Car,
  Search,
  IdCard,
  Mail,
  LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  fingerprint: Fingerprint,
  receipt: Receipt,
  send: Send,
  landmark: Landmark,
  wheat: Wheat,
  wallet: Wallet,
  "credit-card": CreditCard,
  car: Car,
  search: Search,
  "id-card": IdCard,
  mail: Mail,
};

interface EndpointIconProps {
  icon: string;
  isActive: boolean;
  className?: string;
}

const EndpointIcon = ({ icon, isActive, className = "" }: EndpointIconProps) => {
  const IconComponent = iconMap[icon] || Search;

  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
        isActive
          ? "bg-primary/20 scale-110 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
          : "bg-secondary/60 group-hover:bg-primary/10 group-hover:scale-105"
      } ${className}`}
    >
      <IconComponent
        className={`w-4 h-4 transition-all duration-300 ${
          isActive
            ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
            : "text-muted-foreground group-hover:text-primary/70"
        }`}
      />
    </div>
  );
};

export default EndpointIcon;
