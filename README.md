# RentPilot Vercel
Vercel-compatible version of the rental management project.

Architecture:
Vercel frontend -> Vercel serverless API -> Supabase PostgreSQL/Auth/Storage.
WhatsApp uses Meta Cloud API. Excel export uses ExcelJS.

Setup:
1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Create owner login in Supabase Authentication.
3. Push this folder to GitHub.
4. Import repository in Vercel.
5. Add variables from `.env.example`.
6. Deploy.

Never expose SUPABASE_SERVICE_ROLE_KEY in frontend code.
