// app/page.tsx (or wherever your Home route is)
import { withUser } from '@/lib/withUser';
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await withUser();

  if (user) {
    // logged in → send to getting started
    redirect('/getting-started');
  } else {
    // not logged in → send to login
    redirect('/login');
  }

  return null;
}
