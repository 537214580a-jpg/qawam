import Link from 'next/link';
import { getClinicContext } from '@/lib/clinic';
import { EmptyState } from '@/components/page-state';

export default async function ClinicHome() {
  const { db, clinic } = await getClinicContext();
  if (!clinic) {
    return <EmptyState title="لا توجد عيادة مرتبطة" body="لم يتم ربط حسابك بعيادة بعد." />;
  }

  const { data } = await db
    .from('clients')
    .select('id,client_code,full_name,phone,status,created_at')
    .eq('clinic_id', clinic.id)
    .order('created_at', { ascending: false });

  const clients = data || [];
  const activeCount = clients.filter((client) => client.status === 'active').length;
  const archivedCount = clients.filter((client) => client.status === 'archived').length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-qawam-500">{clinic.name}</p>
          <h1 className="mt-1 text-3xl font-extrabold">نظرة عامة</h1>
        </div>
        <Link className="primary-button" href="/clinic/clients">إدارة العملاء</Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['إجمالي العملاء', clients.length],
          ['عملاء نشطون', activeCount],
          ['عملاء مؤرشفون', archivedCount],
        ].map(([title, value]) => (
          <div key={title} className="panel">
            <p className="text-sm text-slate-500">{title}</p>
            <strong className="mt-2 block text-3xl">{value}</strong>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-extrabold">آخر العملاء</h2>
          <Link href="/clinic/clients" className="text-sm font-bold text-qawam-700">عرض الكل</Link>
        </div>
        {!clients.length ? (
          <EmptyState title="لا يوجد عملاء بعد" body="ستظهر هنا ملفات العملاء المسجلة في العيادة." />
        ) : (
          <div className="divide-y">
            {clients.slice(0, 6).map((client) => (
              <div key={client.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold">{client.full_name}</p>
                  <p className="text-xs text-slate-500" dir="ltr">{client.phone || client.client_code}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {client.status === 'active' ? 'نشط' : client.status === 'archived' ? 'مؤرشف' : String(client.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
