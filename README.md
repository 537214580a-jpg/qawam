# قوام | منصة التغذية والمتابعة

منصة PWA عربية لإدارة سجلات العملاء والعيادات. تشمل مساحة العميل، لوحة العيادة، إدارة المنصة، بيانات Supabase مع RLS، الدفع عبر فواتير Moyasar، التقارير وWeb Push.

## 1. المتطلبات

- Node.js 20 LTS أو أحدث وnpm.
- مشروع Supabase مع Auth وDatabase وStorage وRealtime.
- حساب Moyasar للاختبار، ثم مفاتيح الإنتاج عند الجاهزية.
- حساب Vercel مرتبط بمستودع GitHub.

## 2. الإعداد المحلي

```bash
npm install
cp .env.example .env.local
npm run dev
```

أكمل قيم `.env.local` كما يلي:

| المفتاح | مكان الحصول عليه |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | إعدادات مشروع Supabase، API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API keys، publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | API keys، secret service role؛ خادمي فقط |
| `NEXT_PUBLIC_APP_URL` | عنوان الموقع المحلي أو الإنتاج |
| `MOYASAR_SECRET_KEY` | لوحة Moyasar، مفتاح سري للاختبار أو الإنتاج |
| `MOYASAR_WEBHOOK_SECRET` | الرمز السري الذي تحدده عند إعداد Webhook في Moyasar |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | مفاتيح VAPID لـ Web Push |
| `CRON_SECRET` | قيمة طويلة عشوائية لحماية مسارات Cron وWhatsApp stub |

أنشئ مفاتيح VAPID بأداة `web-push generate-vapid-keys`، ثم ضع المفتاح العام فقط في المتغير ذي بادئة `NEXT_PUBLIC_`.

## 3. إعداد Supabase

1. أنشئ مشروع Supabase واختر منطقة مناسبة لمستخدمي السعودية.
2. من SQL Editor شغّل `supabase/migrations/202611090001_qawam_platform.sql` مرة واحدة، ثم شغّل `supabase/seed.sql` لإضافة 60 طعامًا وقوالب الخطط.
3. في Authentication فعّل Email OTP وPhone OTP. إعداد SMS provider ومزوّد البريد مطلوب لإرسال الرموز فعليًا.
4. أضف عنوان الموقع المحلي والإنتاج إلى قائمة Site URL وRedirect URLs.
5. فعّل Realtime لجدول `public.messages` إذا لم تنفذ إضافة الجدول إلى publication عند تشغيل migration.
6. لا تضع service role key في أي متغير يبدأ بـ `NEXT_PUBLIC_`.
7. بعد أول تسجيل مسؤول عيادة، أنشئ سجل عيادة واربط الحساب كمالك في جدول `clinics`. يحتاج مدير المنصة دور `super_admin` مضبوطًا من لوحة موثوقة قبل استخدام `/admin`.

قواعد RLS موجودة على جميع جداول `public` المستخدمة، وملفات الصور الخاصة مخزنة في bucket غير عام. اقرأ إعدادات Data API إذا لم تظهر الجداول المنشأة عبر SQL.

## 4. Moyasar

1. ابدأ بمفاتيح الاختبار.
2. ضع رابط Webhook في لوحة Moyasar: `https://YOUR_DOMAIN/api/webhooks/moyasar`، واختر أحداث نجاح الدفع والفشل والاسترداد، واستخدم قيمة `MOYASAR_WEBHOOK_SECRET` نفسها.
3. تدفق الاشتراك ينشئ فاتورة مستضافة بالريال السعودي، ثم يفعّل الاشتراك بعد إشعار موثّق من Moyasar.
4. مدى وApple Pay والبطاقات تعتمد على تفعيلها في حساب التاجر والتحقق من النطاق لدى Moyasar. لا تستخدم مفاتيح الإنتاج قبل إكمال اختبار الحساب التجاري.

## 5. تشغيل ونشر Vercel

1. ادفع الفرع `main` إلى GitHub، ثم في Vercel اختر **Add New → Project** واستورد مستودع `qawam`.
2. اترك Framework Preset على Next.js، واضبط Root Directory على `.`.
3. أضف متغيرات البيئة من `.env.example` إلى بيئات Preview وProduction. استخدم مفاتيح Moyasar وSupabase الحقيقية على الخادم فقط.
4. انشر المشروع، ثم حدّث `NEXT_PUBLIC_APP_URL` وSupabase Redirect URLs ورابط Moyasar Webhook إلى نطاق Vercel.
5. يعرّف `vercel.json` وظائف Cron لتذكيرات التوقف وتقارير الأسبوع. يتطلب تشغيلها خطة Vercel تدعم Cron، ويجب إضافة `CRON_SECRET`.
6. بعد إعداد VAPID، فعّل إشعارات المتصفح من صفحة العميل. يتطلب Push HTTPS وإذن المستخدم.

## 6. الأمان والخصوصية

- تُقرأ صلاحية الدور من جدول `profiles`، وليس من بيانات المستخدم القابلة للتعديل في JWT.
- خدمة الإدارة بمفتاح الخدمة مستخدمة في Webhooks والحذف والدعوات فقط داخل مسارات الخادم.
- صور الوجبات والقياسات خاصة ضمن مجلد يطابق معرف الحساب، وملفات شعار العيادة في bucket عام للعرض.
- يمكن للعميل تنزيل نسخة JSON من بياناته أو طلب حذف حسابه من صفحة الخصوصية.
- قيم الأطعمة والقوالب أمثلة تقريبية؛ يجب مراجعتها من اختصاصي قبل اعتمادها سريريًا.

## 7. قائمة التحقق قبل الإطلاق

- [ ] إعداد متغيرات البيئة في Preview وProduction.
- [ ] تنفيذ migration وseed ومراجعة سياسات RLS في Supabase.
- [ ] اختبار تسجيل الدخول برمز SMS والبريد من جهاز حقيقي.
- [ ] مراجعة حدود خطة العيادة وتعيين العملاء والفريق.
- [ ] تجربة إنشاء فاتورة Moyasar بمفتاح اختبار والتحقق من Webhook.
- [ ] اختبار عمل الرسائل الفورية بين حساب عميل وأخصائي.
- [ ] تجربة تنزيل PDF وتصدير البيانات وحذف حساب تجريبي.
- [ ] تثبيت PWA على iOS وAndroid والتحقق من Web Push.
- [ ] مراجعة استشاري الخصوصية والامتثال قبل معالجة بيانات صحية حقيقية.

## الأوامر

```bash
npm run dev
npm run typecheck
npm run build
```
