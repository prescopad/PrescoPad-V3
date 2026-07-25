-- queue_counters and share_rate_limits were created without RLS enabled
-- (audit finding). Both are internal counter tables touched exclusively via
-- SECURITY DEFINER functions (next_queue_token, check_and_increment_share_rate_limit)
-- — confirmed via a full grep of frontend/src, website/src, and
-- supabase/functions for direct references: none exist. Enabling RLS with no
-- policies makes both default-deny for any direct client access (the
-- SECURITY DEFINER functions still work, since they run as the function
-- owner and bypass RLS), closing the gap without touching any call site.
alter table queue_counters enable row level security;
alter table share_rate_limits enable row level security;
