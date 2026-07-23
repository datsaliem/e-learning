-- Index every payment foreign key used for joins/deletes.
create index if not exists order_items_instructor_id_idx
  on public.order_items (instructor_id);

create index if not exists payment_webhook_events_order_id_idx
  on public.payment_webhook_events (order_id);

-- The webhook ledger is server-only. Explicit false predicates document the
-- default-deny intent while service_role continues to bypass RLS on the server.
drop policy if exists "payment_webhook_events_deny_clients"
  on public.payment_webhook_events;
create policy "payment_webhook_events_deny_clients"
on public.payment_webhook_events
for all
to anon, authenticated
using (false)
with check (false);
