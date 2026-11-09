'use client';
export default function ClinicError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <div dir="rtl" className="panel mx-auto max-w-lg text-center"><h2 className="text-xl font-extrabold">تعذر تحميل لوحة العيادة</h2><p className="my-3 text-sm text-slate-500">تحقق من اتصالك وحاول مرة أخرى.</p><button className="primary-button" onClick={reset}>إعادة المحاولة</button></div>}
