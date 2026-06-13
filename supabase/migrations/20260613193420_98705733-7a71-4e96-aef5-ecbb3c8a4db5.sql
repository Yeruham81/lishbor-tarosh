
ALTER VIEW public.clue_health SET (security_invoker = true);

-- Lock down EXECUTE on all new SECURITY DEFINER functions
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.is_blocked(uuid)',
    'public.is_submissions_enabled()',
    'public.admin_approve_submission(uuid,integer,integer)',
    'public.admin_reject_submission(uuid,text)',
    'public.admin_adjust_points(uuid,integer,text)',
    'public.admin_set_user_blocked(uuid,boolean)',
    'public.admin_soft_delete_clue(uuid)',
    'public.admin_kpis(integer)',
    'public.admin_daily_active_users(integer)',
    'public.admin_submission_trends(integer)',
    'public.admin_category_performance()',
    'public.clues_sync_is_active()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;
