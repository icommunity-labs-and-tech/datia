'use client';

import { AuthProvider } from '@/hooks/useAuthSeparated';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NotificationListener from '@/components/NotificationListener';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { mantineTheme } from '@/lib/mantine-theme';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={mantineTheme}>
      <Notifications position="bottom-right" />
      <AuthProvider>
        {children}
        <NotificationListener />
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          limit={5}
        />
      </AuthProvider>
    </MantineProvider>
  );
}
