'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getClinicContext } from '@/lib/clinic';

const schema = z.object({
  name: z.string().min(2).max(100),
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoPath: z.string().max(500).optional(),
});

export async function saveBranding(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    primary: formData.get('primary'),
    accent: formData.get('accent'),
    logoPath: formData.get('logoPath') || undefined,
  });
  if (!parsed.success) return { error: 'تحقق من الاسم والألوان.' };

  const { db, user, clinic } = await getClinicContext();
  if (!clinic) return { error: 'لا توجد عيادة مرتبطة.' };

  const { error: nameError } = await db
    .from('clinics')
    .update({ name: parsed.data.name })
    .eq('id', clinic.id);
  if (nameError) return { error: 'تعذر حفظ اسم العيادة.' };

  const { error: settingsError } = await db
    .from('clinic_settings')
    .update({
      brand: { primary: parsed.data.primary, accent: parsed.data.accent },
      settings: { ...clinic.settings, logo_path: parsed.data.logoPath || null },
      updated_by: user.id,
    })
    .eq('clinic_id', clinic.id);
  if (settingsError) return { error: 'تعذر حفظ الهوية البصرية.' };

  revalidatePath('/clinic/settings');
  revalidatePath('/client');
  revalidatePath('/clinic');
  return { success: true };
}
