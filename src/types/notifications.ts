/**
 * Notification domain types
 * 
 * Simple and focused types for the notification system
 */

/**
 * Basic notification interface
 */
export interface Notification {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Interface that entities implement to create their own notifications
 * Can handle both success and error cases
 */
export interface NotificationSource {
  getNotificationData(): Notification;
  getErrorNotificationData?(error: Error): Notification;
}

/**
 * Factory function to create notifications
 */
export function createNotification(
  title: string,
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
): Notification {
  return {
    title,
    message,
    type
  };
}

/**
 * Convenience functions for common notification types
 */
export const createSuccessNotification = (title: string, message: string) => 
  createNotification(title, message, 'success');

export const createErrorNotification = (title: string, message: string) => 
  createNotification(title, message, 'error');

export const createWarningNotification = (title: string, message: string) => 
  createNotification(title, message, 'warning');

export const createInfoNotification = (title: string, message: string) => 
  createNotification(title, message, 'info'); 