import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 1000;

async function readAll(makeQuery: () => any) {
  const rows: any[] = [];
  for (let offset = 0; offset < 100000; offset += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error('DATA_EXPORT_QUERY_FAILED');
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
  throw new Error('DATA_EXPORT_LIMIT_EXCEEDED');
}

function csvSafeFilename(date: string) {
  return 'qawam-data-' + date + '.json';
}

export async function GET() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const [{ data: profile, error: profileError }, { data: client, error: clientError }, consents] = await Promise.all([
      db.from('profiles')
        .select('id,full_name,email,phone,role,avatar_path,created_at,updated_at,locale,consent_health_at')
        .eq('id', user.id)
        .maybeSingle(),
      db.from('clients')
        .select('id,clinic_id,client_number,client_code,full_name,phone,email,date_of_birth,birth_date,sex,status,created_at,updated_at,height_cm,starting_weight_kg,activity_level,goal,bmr,tdee,target_calories,target_protein,target_carbs,target_fat')
        .eq('user_id', user.id)
        .maybeSingle(),
      readAll(() => db.from('consents').select('id,consent_type,version,granted,granted_at,revoked_at').eq('user_id', user.id).order('granted_at'))
    ]);

    if (profileError || clientError) throw new Error('DATA_EXPORT_QUERY_FAILED');
    const result: Record<string, unknown> = {
      format: 'qawam-personal-data-v1',
      exported_at: new Date().toISOString(),
      profile: profile || null,
      client: client || null,
      consents
    };

    const userQueries = [
      ['subscriptions', () => db.from('subscriptions').select('id,clinic_id,plan_id,status,starts_at,ends_at,renews_at,created_at,updated_at').eq('user_id', user.id).order('created_at')],
      ['subscription_requests', () => db.from('subscription_requests').select('id,plan_id,request_type,status,customer_name,customer_phone,plan_name,amount_sar,payment_reference,rejection_reason,approved_at,created_at,updated_at').eq('user_id', user.id).order('created_at')],
      ['payments', () => db.from('payments').select('id,subscription_id,clinic_id,amount_sar,currency,status,moyasar_id,invoice_url,paid_at,created_at').eq('user_id', user.id).order('created_at')],
      ['usual_meals', () => db.from('usual_meals').select('id,name,items,meal_type,created_at,updated_at').eq('user_id', user.id).order('created_at')],
      ['recipes', () => db.from('recipes').select('id,clinic_id,name,servings,is_usual,created_at,recipe_items(id,food_id,name,grams,created_at)').eq('user_id', user.id).order('created_at')],
      ['notifications', () => db.from('notifications').select('id,notification_type,title,body,read_at,created_at,kind,payload').or('recipient_user_id.eq.' + user.id + ',user_id.eq.' + user.id).order('created_at')]
    ] as const;

    const userResults = await Promise.all(userQueries.map(async ([key, query]) => [key, await readAll(query)] as const));
    for (const [key, value] of userResults) result[key] = value;

    if (client) {
      const clientQueries = [
        ['nutrition_profile', () => db.from('nutrition_profiles').select('id,height_cm,current_weight_kg,target_weight_kg,activity_level,nutrition_goal,allergies,created_at,updated_at').eq('client_id', client.id)],
        ['meal_logs', () => db.from('meal_logs').select('id,logged_at,meal_type,photo_path,note,source,created_at,meal_items(id,food_id,name,grams,calories,protein_g,carbs_g,fat_g,specialist_comment,created_at)').eq('client_id', client.id).order('logged_at')],
        ['water_logs', () => db.from('water_logs').select('id,amount_ml,logged_at').eq('client_id', client.id).order('logged_at')],
        ['weight_logs', () => db.from('weight_logs').select('id,weight_kg,logged_on,note').eq('client_id', client.id).order('logged_on')],
        ['measurements', () => db.from('measurements').select('id,measured_at,metric_key,display_name,value,unit,measured_on,waist_cm,hip_cm,chest_cm,arm_cm,thigh_cm,photo_paths,created_at').eq('client_id', client.id).order('measured_at')],
        ['checkins', () => db.from('checkins').select('id,week_start,sleep_score,hunger_score,energy_score,adherence_pct,notes,specialist_reply,created_at').eq('client_id', client.id).order('week_start')],
        ['messages', () => db.from('messages').select('id,sender_id,body,read_at,created_at').eq('client_id', client.id).order('created_at')],
        ['health_conditions', () => db.from('health_conditions').select('id,condition_code,details,status,diagnosed_on,created_at,updated_at').eq('client_id', client.id).order('created_at')],
        ['health_documents', () => db.from('health_documents').select('id,storage_path,original_filename,document_type,content_type,byte_size,document_date,created_at').eq('client_id', client.id).order('created_at')],
        ['lab_results', () => db.from('lab_results').select('id,document_id,test_name,result_value,unit,reference_range,lab_name,tested_on,source,confirmed_at,supersedes_id,created_at').eq('client_id', client.id).order('tested_on')],
        ['health_readings', () => db.from('health_readings').select('id,reading_type,value_primary,value_secondary,unit,context,measured_at,notes,created_at').eq('client_id', client.id).order('measured_at')],
        ['meal_plans', () => db.from('meal_plans').select('id,parent_plan_id,version_number,title,status,effective_from,effective_until,calories_kcal,protein_g,carbohydrates_g,fat_g,created_at,meal_plan_meals(id,sort_order,meal_name,meal_time,ingredients,instructions,calories_kcal,protein_g,carbohydrates_g,fat_g)').eq('client_id', client.id).order('created_at')],
        ['reports', () => db.from('reports').select('id,report_type,status,storage_path,period_start,period_end,created_at,ready_at').eq('client_id', client.id).order('created_at')],
        ['health_record_requests', () => db.from('health_record_requests').select('id,preferred_language,include_originals,status,requested_at,updated_at,delivery_path').eq('user_id', user.id).order('requested_at')]
      ] as const;

      const clientResults = await Promise.all(clientQueries.map(async ([key, query]) => [key, await readAll(query)] as const));
      for (const [key, value] of clientResults) result[key] = value;
    }

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(result, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'attachment; filename="' + csvSafeFilename(date) + '"',
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('QAWAM personal data export failed', error);
    return NextResponse.json({ error: 'تعذر تجهيز نسخة البيانات كاملة. حاول مرة أخرى.' }, {
      status: 500,
      headers: { 'cache-control': 'no-store' }
    });
  }
}
