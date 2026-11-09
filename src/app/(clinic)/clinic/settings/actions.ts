'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getClinicContext } from '@/lib/clinic';
const schema=z.object({name:z.string().min(2).max(100),primary:z.string().regex(/^#[0-9A-Fa-f]{6}$/),accent:z.string().regex(/^#[0-9A-Fa-f]{6}$/),logoPath:z.string().max(500).optional()});
export async function saveBranding(formData:FormData){const p=schema.safeParse({name:formData.get('name'),primary:formData.get('primary'),accent:formData.get('accent'),logoPath:formData.get('logoPath')||undefined});if(!p.success)return {error:'تحقق من الاسم والألوان.'};const {db,clinic}=await getClinicContext();if(!clinic)return {error:'لا توجد عيادة مرتبطة.'};const {error}=await db.from('clinics').update({name:p.data.name,brand_primary:p.data.primary,brand_accent:p.data.accent,logo_path:p.data.logoPath||clinic.logo_path}).eq('id',clinic.id);if(error)return {error:'تعذر حفظ إعدادات الهوية.'};revalidatePath('/clinic/settings');revalidatePath('/client');return {success:true};}
