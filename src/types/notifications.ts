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

