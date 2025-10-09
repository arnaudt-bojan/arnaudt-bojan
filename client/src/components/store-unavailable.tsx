import { Card, CardContent } from "@/components/ui/card";
import { Store, Clock, Mail } from "lucide-react";

interface StoreUnavailableProps {
  sellerName?: string;
  sellerEmail?: string;
}

export function StoreUnavailable({ sellerName, sellerEmail }: StoreUnavailableProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 pb-8 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
            <Store className="h-10 w-10 text-muted-foreground" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              {sellerName ? `${sellerName}'s Store` : "Store"} is Currently Unavailable
            </h2>
            <p className="text-muted-foreground">
              This store is temporarily inactive and not accepting orders at this time.
            </p>
          </div>

          {/* Status Cards */}
          <div className="space-y-3 pt-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg text-left">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Store Status</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The store owner has temporarily paused operations
                </p>
              </div>
            </div>

            {sellerEmail && (
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg text-left">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Questions?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contact the store owner at{" "}
                    <a 
                      href={`mailto:${sellerEmail}`}
                      className="text-primary hover:underline"
                    >
                      {sellerEmail}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <p className="text-xs text-muted-foreground pt-4 border-t">
            Please check back later or contact the store owner for updates
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
