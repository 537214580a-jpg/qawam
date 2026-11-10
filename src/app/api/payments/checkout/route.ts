import { NextResponse } from 'next/server';

export async function POST(){
 return NextResponse.json(
  {error:'الدفع الإلكتروني غير متاح حاليًا. أرسل طلب الاشتراك عبر واتساب.'},
  {status:410}
 );
}
