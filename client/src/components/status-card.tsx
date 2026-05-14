import { Card, CardContent } from "@/components/ui/card";

interface StatusCardProps {
  title: string;
  value: string;
  icon: string;
  description: string;
  variant?: "success" | "info" | "warning" | "error";
}

export default function StatusCard({ 
  title, 
  value, 
  icon, 
  description, 
  variant = "success" 
}: StatusCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          valueColor: "text-green-400",
          iconBg: "bg-green-500/10",
          iconColor: "text-green-400"
        };
      case "info":
        return {
          valueColor: "text-blue-400",
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-400"
        };
      case "warning":
        return {
          valueColor: "text-yellow-400",
          iconBg: "bg-yellow-500/10",
          iconColor: "text-yellow-400"
        };
      case "error":
        return {
          valueColor: "text-red-400",
          iconBg: "bg-red-500/10",
          iconColor: "text-red-400"
        };
      default:
        return {
          valueColor: "text-green-400",
          iconBg: "bg-green-500/10",
          iconColor: "text-green-400"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-lg font-semibold ${styles.valueColor}`} data-testid={`status-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
          </div>
          <div className={`w-8 h-8 ${styles.iconBg} rounded-lg flex items-center justify-center`}>
            <span className={styles.iconColor}>{icon}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}
