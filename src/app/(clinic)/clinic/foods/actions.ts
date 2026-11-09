'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getClinicContext } from '@/lib/clinic';
const schema=z.object({name:z.string().trim().min(2).max(100),calories:z.coerce.number().min(0).max(10000),protein:z.coerce.number().min(0).max(1000),carbs:z.coerce.number().min(0).max(1500),fat:z.coerce.number().min(0).max(1000)});
export async function createClinicFood(formData:FormData){const p=schema.safeParse(Object.fromEntries(formData));if(!p.success)return {error:'تحقق من اسم الطعام والقيم لكل 100 غرام.'};const {db,user,clinic}=await getClinicContext();if(!clinic)return {error:'لا توجد عيادة مرتبطة.'};const d=p.data;const {error}=await db.from('foods').insert({clinic_id:clinic.id,created_by:user.id,name_ar:d.name,calories:d.calories,protein_g:d.protein,carbs_g:d.carbs,fat_g:d.fat,is_public:false});if(error)return {error:'تعذر إضافة الطعام.'};revalidatePath('/clinic/foods');return {success:true};}
