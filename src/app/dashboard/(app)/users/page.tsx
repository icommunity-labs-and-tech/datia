import { redirect } from 'next/navigation';

// User management is not exposed in the UI yet — send visitors back to the app.
export default function UsersPage() {
  redirect('/dashboard');
}
