# بنية مشروع قوام

```text
qawam/
├── package.json
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
├── README.md
├── supabase/
│   ├── migrations/202611090001_qawam_platform.sql
│   └── seed.sql
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── offline.html
│   └── icons/qawam.svg
└── src/
    ├── middleware.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── (auth)/login/
    │   ├── (client)/client/
    │   │   ├── onboarding/
    │   │   ├── consent/
    │   │   ├── food/
    │   │   ├── progress/
    │   │   ├── checkin/
    │   │   ├── chat/
    │   │   ├── notifications/
    │   │   ├── subscription/
    │   │   └── settings/
    │   ├── (clinic)/clinic/
    │   │   ├── clients/[id]/
    │   │   ├── plans/
    │   │   ├── foods/
    │   │   ├── analytics/
    │   │   ├── team/
    │   │   └── settings/
    │   ├── (admin)/admin/
    │   └── api/
    │       ├── payments/checkout/
    │       ├── webhooks/
    │       ├── privacy/
    │       ├── push/
    │       └── cron/
    ├── components/
    └── lib/
        ├── auth.ts
        ├── clinic.ts
        ├── nutrition.ts
        ├── push.ts
        └── supabase/
```
