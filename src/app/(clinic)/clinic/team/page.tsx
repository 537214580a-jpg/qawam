import { getClinicContext } from '@/lib/clinic';
import { TeamManager } from '@/components/team-manager';

export default async function TeamPage() {
  const { db, clinic } = await getClinicContext();
  if (!clinic) return <section className="panel">لا توجد عيادة مرتبطة بهذا الحساب.</section>;

  const { data: specialistRole } = await db
    .from('clinic_roles')
    .select('id')
    .eq('clinic_id', clinic.id)
    .eq('role_key', 'specialist')
    .maybeSingle();

  const [{ data: memberships }, { data: clients }] = await Promise.all([
    specialistRole
      ? db.from('clinic_memberships').select('user_id').eq('clinic_id', clinic.id).eq('role_id', specialistRole.id).eq('status', 'active')
      : Promise.resolve({ data: [] }),
    db.from('clients').select('id,full_name').eq('clinic_id', clinic.id).order('created_at', { ascending: false }),
  ]);

  const memberIds = (memberships || []).map((membership) => membership.user_id);
  const { data: profiles } = memberIds.length
    ? await db.from('user_profiles').select('user_id,full_name').in('user_id', memberIds)
    : { data: [] };
  const specialistNames = new Map((profiles || []).map((person) => [person.user_id, person.full_name]));

  const specialists = (memberships || []).map((membership) => ({
    id: membership.user_id,
    name: specialistNames.get(membership.user_id) || 'أخصائي',
  }));
  const clientItems = (clients || []).map((client) => ({ id: client.id, name: client.full_name }));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-qawam-500">إدارة الفريق</p>
        <h1 className="mt-1 text-3xl font-extrabold">الأخصائيون وتوزيع العملاء</h1>
      </header>
      <TeamManager specialists={specialists} clients={clientItems} />
      <section className="panel">
        <h2 className="font-extrabold">الفريق الحالي</h2>
        {!specialists.length
          ? <p className="mt-3 text-sm text-slate-500">لا يوجد أخصائيون مرتبطون بعد.</p>
          : specialists.map((member) => (
            <p key={member.id} className="border-t py-3 text-sm">
              {member.name} <span className="text-slate-400">أخصائي تغذية</span>
            </p>
          ))}
      </section>
    </div>
  );
}
