import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface BackToDashboardProps {
  label?: string;
  href?: string;
}

export function BackToDashboard({ label = "Back to Dashboard", href = "/seller-dashboard" }: BackToDashboardProps) {
  return (
    <div className="mb-6">
      <Link href={href}>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" data-testid="button-back-to-dashboard">
          <ChevronLeft className="h-4 w-4" />
          {label}
        </Button>
      </Link>
    </div>
  );
}
