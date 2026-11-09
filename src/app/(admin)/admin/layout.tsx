import { requireProfile } from '@/lib/auth';
import { ClinicShell } from '@/components/clinic-shell';
export default async function AdminLayout({children}:{children:React.ReactNode}) { const profile=await requireProfile(['super_admin']); return <ClinicShell name={profile.full_name} admin>{children}</ClinicShell>; }
