import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to super admin login by default
  // Tenants access via /{tenant-slug}/login
  redirect('/super-admin/login');
}
