# Carbon Gym — Production Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard/projects
2. Click **New Project**
3. Settings:
   - Name: `carbon-gym`
   - Database password: generate and **save this**
   - Region: `us-central-1` (closest to Denver)
4. Wait ~2 minutes for provisioning

### Get your credentials

From **Settings > API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

From **Settings > Database > Connection string > URI**:
- Connection string → `DATABASE_URL`

## Step 2: Set Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all Supabase values from Step 1.

## Step 3: Push Database Schema

```bash
npx prisma db push
```

This creates all 35+ tables in your Supabase PostgreSQL database.

## Step 4: Export Data from Exercise.com

```bash
npx tsx scripts/export/run-all.ts
```

This opens a browser window. On first run:
1. Log into home.carbontc.co when the browser opens
2. The script will wait for you to authenticate
3. Once logged in, it scrapes all data automatically
4. Output goes to `data-export/*.json`

## Step 5: Import Data

```bash
npx tsx scripts/import/run-all.ts
```

This imports all scraped data into your Supabase database:
- Organization, staff, services, groups, exercises, plans, clients, locations

## Step 6: Set Up Auth Users

1. Edit `scripts/setup-auth.ts` — set passwords for each staff member
2. Run:

```bash
npx tsx scripts/setup-auth.ts
```

This creates Supabase Auth users and links them to StaffMember records.

## Step 7: Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod
```

Or connect via the Vercel dashboard:
1. Go to https://vercel.com/new
2. Import the `carbon-gym` repo
3. Set environment variables (same as .env.local)
4. Deploy

### Required Vercel Environment Variables

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Supabase > Settings > Database |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |

## Step 8: Configure Custom Domain (Optional)

1. In Vercel, go to project Settings > Domains
2. Add your domain (e.g., `app.carbontc.co`)
3. Update DNS records as instructed

## Step 9: Set Up Stripe (When Ready)

1. Create account at https://stripe.com
2. Get API keys from Stripe Dashboard > Developers
3. Add to environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Create products/prices for each package in Stripe
5. Set up webhook endpoint: `https://your-domain/api/webhooks/stripe`

## Step 10: Set Up Email (When Ready)

1. Create account at https://resend.com
2. Verify your sending domain
3. Get API key
4. Add to environment variables:
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (e.g., `Carbon Training Centre <hello@carbontc.co>`)
