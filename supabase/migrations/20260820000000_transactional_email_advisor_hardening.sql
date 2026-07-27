-- Cover the Auth user foreign key for account deletion and make the private
-- tables' deny-all RLS posture explicit to database advisors.

create index transactional_email_outbox_user_idx
  on private.transactional_email_outbox (user_id);

create policy "transactional_email_outbox_deny_direct_access"
on private.transactional_email_outbox
for all
to public
using (false)
with check (false);

create policy "transactional_email_logs_deny_direct_access"
on private.transactional_email_logs
for all
to public
using (false)
with check (false);
