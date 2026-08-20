import { redirect } from 'next/navigation';

// Status types are not exposed in the UI yet — send visitors back to the app.
export default function StatusTypesPage() {
  redirect('/dashboard');
}
