/**
 * Event-based notification system
 * 
 * This system allows publishing notifications from anywhere in the application
 * without coupling to specific UI components
 */

import { Notification } from '@/types/notifications';

// Event types
export type NotificationEvent = {
  type: 'NOTIFICATION';
  payload: Notification;
};

export type NotificationEventHandler = (event: NotificationEvent) => void;

class NotificationEventBus {
  private listeners: NotificationEventHandler[] = [];

  /**
   * Subscribe to notification events
   */
  subscribe(handler: NotificationEventHandler): () => void {
    this.listeners.push(handler);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(handler);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Publish a notification event
   */
  publish(notification: Notification): void {
    const event: NotificationEvent = {
      type: 'NOTIFICATION',
      payload: notification
    };

    this.listeners.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in notification event handler:', error);
      }
    });
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners = [];
  }
}

// Global event bus instance
export const notificationEventBus = new NotificationEventBus();

/**
 * Publish a notification event
 */
export function publishNotification(notification: Notification): void {
  notificationEventBus.publish(notification);
}

/**
 * Convenience functions for publishing common notification types
 */
export function publishSuccessNotification(title: string, message: string): void {
  publishNotification({
    title,
    message,
    type: 'success'
  });
}

export function publishErrorNotification(title: string, message: string): void {
  publishNotification({
    title,
    message,
    type: 'error'
  });
}

export function publishWarningNotification(title: string, message: string): void {
  publishNotification({
    title,
    message,
    type: 'warning'
  });
}

export function publishInfoNotification(title: string, message: string): void {
  publishNotification({
    title,
    message,
    type: 'info'
  });
} 