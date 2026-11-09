'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getClinicContext } from '@/lib/clinic';
import { getProfile } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const inviteSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(2).max(100),
});

async function hasPermission(permission: string) {
  const { db, clinic } = await getClinicContext();
  if (!clinic) return null;
  const { data, error } = await db.rpc('has_clinic_permission', {
    p_clinic_id: clinic.id,
    p_permission: permission,
  });
  if (error || !data) return null;
  return { db, clinic };
}

async function inviteUser(email: string, name: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
  });
  if (error || !data.user) return { admin: null, user: null };
  const { error: profileError } = await admin
    .from('user_profiles')
    .upsert({ user_id: data.user.id, full_name: name }, { onConflict: 'user_id' });
  if (profileError) return { admin, user: null };
  return { admin, user: data.user };
}

export async function inviteSpecialist(formData: FormData) {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
  });
  if (!parsed.success) return { error: 'تحقق من الاسم والبريد الإلكتروني.' };

  const profile = await getProfile();
  if (profile?.role !== 'clinic_admin') return { error: 'هذه العملية متاحة لمسؤول العيادة فقط.' };
  const access = await hasPermission('members.manage');
  if (!access) return { error: 'غير مصرح بإدارة أعضاء العيادة.' };

  const { admin, user } = await inviteUser(parsed.data.email, parsed.data.name);
  if (!admin || !user) return { error: 'تعذر إنشاء الحساب أو تحديث ملفه.' };

  const { data: existingRole } = await admin
    .from('clinic_roles')
    .select('id')
    .eq('clinic_id', access.clinic.id)
    .eq('role_key', 'specialist')
    .maybeSingle();

  let roleId = existingRole?.id;
  if (!roleId) {
    const { data: newRole, error: roleError } = await admin
      .from('clinic_roles')
      .insert({
        clinic_id: access.clinic.id,
        role_key: 'specialist',
        display_name_ar: 'أخصائي تغذية',
        display_name_en: 'Nutrition Specialist',
        is_system: true,
      })
      .select('id')
      .single();
    if (roleError || !newRole) return { error: 'تم إنشاء الدعوة لكن تعذر إعداد دور الأخصائي.' };
    roleId = newRole.id;
    const specialistPermissions = ['clients.read', 'clients.write', 'nutrition.read', 'nutrition.write', 'reports.read', 'reviews.read', 'reviews.write'];
    await admin.from('role_permissions').upsert(
      specialistPermissions.map((permission_key) => ({
        clinic_id: access.clinic.id,
        role_id: roleId,
        permission_key,
      })),
      { onConflict: 'clinic_id,role_id,permission_key', ignoreDuplicates: true },
    );
  }

  const { error: membershipError } = await admin
    .from('clinic_memberships')
    .upsert({
      clinic_id: access.clinic.id,
      user_id: user.id,
      role_id: roleId,
      status: 'active',
      invited_email: parsed.data.email,
    }, { onConflict: 'clinic_id,user_id' });
  if (membershipError) return { error: 'تم إرسال الدعوة لكن تعذر ربط الأخصائي بالعيادة.' };

  revalidatePath('/clinic/team');
  return { success: true };
}

export async function inviteClient(formData: FormData) {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
  });
  if (!parsed.success) return { error: 'تحقق من اسم العميل والبريد الإلكتروني.' };

  const profile = await getProfile();
  if (!profile || !['clinic_admin', 'specialist'].includes(profile.role)) {
    return { error: 'غير مصرح بدعوة عميل.' };
  }
  const access = await hasPermission('clients.write');
  if (!access) return { error: 'غير مصرح بإضافة عملاء إلى العيادة.' };

  const { admin, user } = await inviteUser(parsed.data.email, parsed.data.name);
  if (!admin || !user) return { error: 'تعذر إنشاء الحساب أو تحديث ملفه.' };

  const clientNumber = Date.now();
  const clientCode = `QW-${clientNumber}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { error: clientError } = await admin.from('clients').insert({
    clinic_id: access.clinic.id,
    client_number: clientNumber,
    client_code: clientCode,
    full_name: parsed.data.name,
    email: parsed.data.email,
    created_by: profile.id,
  });

  if (clientError) return { error: 'أُرسلت الدعوة، لكن تعذر إنشاء ملف العميل في العيادة.' };

  revalidatePath('/clinic/clients');
  revalidatePath('/clinic/team');
  return { success: true };
}

const assignSchema = z.object({
  clientId: z.string().uuid(),
  specialistId: z.string().uuid(),
});

export async function assignSpecialist(formData: FormData) {
  const parsed = assignSchema.safeParse({
    clientId: formData.get('clientId'),
    specialistId: formData.get('specialistId'),
  });
  if (!parsed.success) return { error: 'اختر العميل والأخصائي.' };

  const profile = await getProfile();
  if (profile?.role !== 'clinic_admin') return { error: 'هذه العملية متاحة لمسؤول العيادة فقط.' };
  const access = await hasPermission('clients.write');
  if (!access) return { error: 'غير مصرح بتوزيع العملاء.' };

  const { db, clinic } = access;
  const [{ data: client }, { data: specialist }] = await Promise.all([
    db.from('clients').select('id').eq('id', parsed.data.clientId).eq('clinic_id', clinic.id).maybeSingle(),
    db.from('clinic_memberships')
      .select('user_id,clinic_roles(role_key)')
      .eq('clinic_id', clinic.id)
      .eq('user_id', parsed.data.specialistId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  const linkedRole = specialist?.clinic_roles;
  const role = (Array.isArray(linkedRole) ? linkedRole[0] : linkedRole) as { role_key?: string } | null;
  if (!client || role?.role_key !== 'specialist') return { error: 'تعذر التحقق من العميل أو الأخصائي.' };

  const { error } = await db
    .from('clients')
    .update({ assigned_staff_user_id: parsed.data.specialistId })
    .eq('id', client.id);
  if (error) return { error: 'تعذر تعيين الأخصائي.' };

  revalidatePath('/clinic/team');
  revalidatePath('/clinic/clients');
  return { success: true };
}
