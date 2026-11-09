'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getClinicContext } from '@/lib/clinic';
const noteSchema=z.object({clientId:z.string().uuid(),note:z.string().trim().min(1).max(5000)});
export async function addPrivateNote(formData:FormData){const p=noteSchema.safeParse(Object.fromEntries(formData));if(!p.success)return {error:'أدخل الملاحظة.'};const {db,user,clinic}=await getClinicContext();if(!clinic)return {error:'لا توجد عيادة مرتبطة.'};const {error}=await db.from('client_notes').insert({client_id:p.data.clientId,author_id:user.id,note:p.data.note});if(error)return {error:'تعذر حفظ الملاحظة.'};revalidatePath(`/clinic/clients/${p.data.clientId}`);return {success:true};}
const commentSchema=z.object({itemId:z.string().uuid(),clientId:z.string().uuid(),comment:z.string().max(2000)});
export async function commentMeal(formData:FormData){const p=commentSchema.safeParse(Object.fromEntries(formData));if(!p.success)return {error:'التعليق غير صالح.'};const {db}=await getClinicContext();const {error}=await db.from('meal_items').update({specialist_comment:p.data.comment}).eq('id',p.data.itemId);if(error)return {error:'تعذر حفظ التعليق.'};revalidatePath(`/clinic/clients/${p.data.clientId}`);return {success:true};}
