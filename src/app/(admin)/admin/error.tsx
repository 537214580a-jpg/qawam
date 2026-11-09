'use client';
export default function AdminError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <div dir="rtl" className="panel mx-auto max-w-lg text-center"><h2 className="text-xl font-extrabold">تعذر تحميل لوحة المنصة</h2><p className="my-3 text-sm text-slate-500">حاول مرة أخرى بعد قليل.</p><button className="primary-button" onClick={reset}>إعادة المحاولة</button></div>}
