import { requireProfile } from '@/lib/auth';
import { ClinicShell } from '@/components/clinic-shell';
export default async function ClinicLayout({children}:{children:React.ReactNode}) { const profile=await requireProfile(['specialist','clinic_admin']); return <ClinicShell name={profile.full_name}>{children}</ClinicShell>; }
