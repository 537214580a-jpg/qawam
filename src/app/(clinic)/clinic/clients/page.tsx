import { getClinicContext } from '@/lib/clinic';

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const { db, clinic } = await getClinicContext();
  if (!clinic) return <section className="panel">لا توجد عيادة مرتبطة بهذا الحساب.</section>;

  const { data } = await db
    .from('clients')
    .select('id,client_code,full_name,phone,email,status,created_at')
    .eq('clinic_id', clinic.id)
    .order('created_at', { ascending: false });

  const search = (searchParams.q || '').trim().toLocaleLowerCase('ar');
  const clients = (data || []).filter((client) =>
    !search || `${client.full_name} ${client.phone || ''} ${client.email || ''} ${client.client_code}`
      .toLocaleLowerCase('ar')
      .includes(search)
  );

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-qawam-500">إدارة المتابعة</p>
        <h1 className="mt-1 text-3xl font-extrabold">العملاء</h1>
      </header>
      <form className="panel flex flex-wrap gap-3">
        <input name="q" defaultValue={searchParams.q} className="field min-w-56 flex-1" placeholder="ابحث بالاسم أو الجوال أو البريد" />
        <button className="primary-button">بحث</button>
      </form>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="text-slate-500">
            <tr><th className="p-3">الاسم</th><th className="p-3">رقم العميل</th><th className="p-3">الجوال</th><th className="p-3">البريد</th><th className="p-3">الحالة</th></tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t">
                <td className="p-3 font-bold">{client.full_name}</td>
                <td className="p-3">{client.client_code}</td>
                <td className="p-3" dir="ltr">{client.phone || '—'}</td>
                <td className="p-3" dir="ltr">{client.email || '—'}</td>
                <td className="p-3">{client.status === 'active' ? 'نشط' : client.status === 'archived' ? 'مؤرشف' : String(client.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clients.length && <p className="py-8 text-center text-slate-500">لا يوجد عملاء مطابقون للبحث.</p>}
      </div>
    </div>
  );
}
