import { Link } from "wouter";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardBreadcrumbProps {
  currentPage?: string;
  variant?: "default" | "minimal";
}

export function DashboardBreadcrumb({ currentPage, variant = "default" }: DashboardBreadcrumbProps) {
  if (variant === "minimal") {
    return (
      <Link href="/seller-dashboard">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          data-testid="button-back-to-dashboard"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>
      </Link>
    );
  }

  return (
    <div className="mb-6">
      <Link href="/seller-dashboard">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 hover-elevate"
          data-testid="button-back-to-dashboard"
        >
          <ChevronLeft className="h-4 w-4" />
          <LayoutDashboard className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
      {currentPage && (
        <h1 className="text-3xl font-bold mt-4" data-testid="text-page-title">
          {currentPage}
        </h1>
      )}
    </div>
  );
}
