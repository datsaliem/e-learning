This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

For this project's production variables, Supabase/Stripe checks, go-live checklist, and rollback
procedure, use [`docs/production-deployment.md`](docs/production-deployment.md).

## Stripe Checkout

Checkout is provider-based (`features/checkout/providers`) so another payment gateway can be
added later without changing the order and enrollment model. Stripe is the supported provider.
Set `PAYMENT_PROVIDER=disabled` to deploy without Stripe; checkout then shows a clear
temporary-unavailable message and no Stripe secret is required.

1. To enable payments, set `PAYMENT_PROVIDER=stripe`, then copy the payment variables from
   `.env.example` to `.env.local` and set `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, and
   `STRIPE_WEBHOOK_SECRET`. These values are server-only and must never use the `NEXT_PUBLIC_`
   prefix.
2. Apply migrations with `supabase db push --linked`.
3. In Stripe Workbench, register `https://your-domain/api/webhooks/stripe` for:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, and `checkout.session.expired`.
4. For local testing, run:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   Copy the `whsec_...` value printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET`.

The checkout service only accepts paid, published courses stored in Supabase with UUID IDs.
This is intentional: mock catalog entries are display-only until the future CMS publishes them
to the `courses` table. Prices are always recalculated from that table before an order snapshot
is created.
