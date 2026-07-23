-- Admin already has SELECT policies on every table used by the dashboard.
-- Run the aggregate function with the caller's privileges so RLS remains in
-- force and no privileged database execution is exposed through the Data API.

alter function public.get_admin_dashboard() security invoker;

comment on function public.get_admin_dashboard() is
  'RLS-enforced aggregate platform metrics exclusively for the authenticated admin.';
