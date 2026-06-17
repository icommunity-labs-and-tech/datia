/**
 * Notification Listener Component
 * 
 * This component listens to notification events and displays them as toasts
 * It's completely decoupled from any specific business logic
 */

'use client';

import { useEffect } from 'react';
import { toast } from 'react-toastify';
import React from 'react';
import { notificationEventBus, NotificationEvent } from '@/lib/notificationEvents';

export default function NotificationListener() {
  useEffect(() => {
    // Subscribe to notification events
    const unsubscribe = notificationEventBus.subscribe((event: NotificationEvent) => {
      if (event.type === 'NOTIFICATION') {
        const { title, message, type } = event.payload;
        
        // Display toast notification
        toast(
          React.createElement('div', {},
            React.createElement('strong', {}, title),
            React.createElement('br'),
            message
          ),
          {
            type,
            position: 'bottom-right',
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            pauseOnFocusLoss: false,
          }
        );
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // This component doesn't render anything visible
  return null;
} 