export interface NotificationEvent {
  id: string;
  userId: string;
  type: 'order' | 'payment' | 'shipping' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface SystemNotificationEvent {
  type: 'maintenance' | 'announcement' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
}
