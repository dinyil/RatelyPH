# RatelyPH — NFC calling cards

Isang domain, maraming NFC card. Bawat card may sariling 5-character link (`/k7x2m`) at
sariling itsura. Static site lang (walang build step) + Supabase para sa database at login.

```
index.html        → ang card page (nilo-load ang data galing Supabase base sa /code)
assets/           → card.css, card.js, config.js (Supabase URL + anon key)
admin/            → /admin  (login, customers, NFC tags)
supabase/schema.sql
vercel.json  _redirects  _headers   → routing para sa Vercel / Netlify / Cloudflare Pages
```

## Paano gumagana

- **profiles** = laman + itsura ng isang customer page (pangalan, number, email, socials, services, theme).
- **nfc_tags** = bawat pisikal na NFC card. May random 5-char `code` at naka-assign sa isang profile.
  Pwedeng maraming tag sa iisang customer, at pwedeng i-reassign o patayin kahit kailan.
  Pwede ka ring mag-generate ng 50 tags nang walang customer, i-write sa mga card, tapos i-assign mamaya
  (habang unassigned, "Card not activated yet" ang lalabas).
- Ang `admin` ay reserved: hindi ito pwedeng maging code (DB constraint + route).
- Ang public ay may isa lang na magagawa: `get_card(code)`. Hindi nila mababasa ang tables, kaya hindi
  nila ma-list ang lahat ng customer. Naglo-log din ito ng scan count kada tag.
- **Save contact** → nagda-download ng `.vcf` (vCard 3.0) mula sa data ng customer.
- Itsura kada customer (sa admin): colors (auto/dark/light/high-contrast/paper), font, layout (left/center),
  background (orbs/grid/plain), at optional na accent color.

## Setup

1. **Supabase** → gumawa ng project → SQL Editor → i-paste at i-run ang `supabase/schema.sql`.
2. **Admin account**: Authentication → Users → *Add user* (email + password, Auto Confirm).
   Tapos Authentication → Providers → Email → i-OFF ang *Allow new users to sign up*.
   Tapos i-run ito sa SQL Editor (palitan ang email):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com' on conflict do nothing;
   ```
3. **I-edit ang `assets/config.js`**: ilagay ang Project URL at `anon`/publishable key
   (Project Settings → API). Public ang mga ito; **huwag** ilagay ang `service_role` key.
4. **Deploy** (root directory ng repo, walang build command, output dir = `/`):
   - **Vercel**: Import repo → Framework "Other". Gagamitin ang `vercel.json`.
   - **Netlify**: New site from Git → Publish directory `.`. Gagamitin ang `_redirects`/`_headers`.
   - **Cloudflare Pages**: Connect repo → Build command wala, output dir `/`. Gagamitin ang `_redirects`/`_headers`.
5. Buksan ang `https://yourdomain/admin`, mag-login, **New customer** (may auto-generate na NFC tag),
   kopyahin ang link (`https://yourdomain/k7x2m`) at i-write sa NFC card gamit ang NFC Tools (URL record).

## Local test

```
npx serve -s .        # -s = fallback sa index.html para gumana ang /k7x2m
```
O buksan ang `/?c=k7x2m` sa kahit anong simpleng static server.

## Notes

- Mag-ingat sa `admin` password; ang security ay nasa database (RLS + `is_admin()`), hindi sa JS.
- Para mag-block ng pag-sign up ng iba, i-OFF ang email sign-ups (step 2). Kahit may account sila,
  hindi sila admin kung wala sa `admins` table.
- Ang sample card (`Marites Home Bakes`) ay nasa dulo ng `schema.sql` bilang commented seed.
