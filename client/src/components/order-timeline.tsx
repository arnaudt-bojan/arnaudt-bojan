import { format } from "date-fns";
import { Mail, RefreshCw, DollarSign, FileText, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrderEvent } from "@shared/schema";

interface OrderTimelineProps {
  events: OrderEvent[];
}

export function OrderTimeline({ events }: OrderTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No events recorded for this order yet</p>
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "email_sent":
        return <Mail className="h-4 w-4" />;
      case "status_change":
        return <RefreshCw className="h-4 w-4" />;
      case "payment_received":
      case "balance_payment_requested":
      case "balance_payment_received":
        return <DollarSign className="h-4 w-4" />;
      case "document_generated":
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "email_sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "status_change":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "payment_received":
      case "balance_payment_received":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "balance_payment_requested":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "document_generated":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "refund_processed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "tracking_updated":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case "email_sent":
        return "Email Sent";
      case "status_change":
        return "Status Changed";
      case "payment_received":
        return "Payment Received";
      case "balance_payment_requested":
        return "Balance Payment Requested";
      case "balance_payment_received":
        return "Balance Payment Received";
      case "document_generated":
        return "Document Generated";
      case "refund_processed":
        return "Refund Processed";
      case "tracking_updated":
        return "Tracking Updated";
      default:
        return eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const getEmailType = (payload: any): string | null => {
    if (!payload) return null;
    try {
      const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
      return parsed.emailType || null;
    } catch {
      return null;
    }
  };

  const getRecipient = (payload: any): string | null => {
    if (!payload) return null;
    try {
      const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
      return parsed.recipient || null;
    } catch {
      return null;
    }
  };

  // Sort events by date, newest first
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return (
    <div className="space-y-4" data-testid="order-timeline">
      <div className="flex items-center gap-2 text-sm font-semibold mb-4">
        <Clock className="h-4 w-4" />
        <span>Order Timeline</span>
        <Badge variant="outline" className="ml-auto">
          {events.length} {events.length === 1 ? "event" : "events"}
        </Badge>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {sortedEvents.map((event, index) => {
            const emailType = getEmailType(event.payload);
            const recipient = getRecipient(event.payload);
            
            return (
              <div
                key={event.id}
                className="relative pl-10"
                data-testid={`timeline-event-${event.id}`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1 flex items-center justify-center w-9 h-9 rounded-full border-2 border-background ${getEventColor(
                    event.eventType
                  )}`}
                >
                  {getEventIcon(event.eventType)}
                </div>

                {/* Event content */}
                <div className="pb-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getEventColor(event.eventType)}>
                        {getEventLabel(event.eventType)}
                      </Badge>
                      {emailType && (
                        <Badge variant="outline" className="text-xs">
                          {emailType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(event.occurredAt), "PPp")}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-sm font-medium mb-1">{event.description}</p>
                  )}

                  {recipient && (
                    <p className="text-xs text-muted-foreground">
                      To: {recipient}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
