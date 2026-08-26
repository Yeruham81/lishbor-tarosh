-- Keep at most one active PayPal checkout per user and environment. Existing
-- duplicate pending rows are failed before the invariant is installed.
WITH ranked_pending AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, provider, environment
      ORDER BY created_at DESC, id DESC
    ) AS row_number
  FROM public.purchases
  WHERE status = 'pending'
)
UPDATE public.purchases AS purchase
SET status = 'failed'
FROM ranked_pending AS ranked
WHERE purchase.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS purchases_one_pending_per_user_provider_environment_idx
  ON public.purchases(user_id, provider, environment)
  WHERE status = 'pending';

-- Granting Premium and completing the purchase remain one transaction. The
-- function now fails and rolls everything back if the user's profile is gone.
CREATE OR REPLACE FUNCTION public.complete_purchase(
  _purchase_id uuid,
  _capture_id text,
  _merchant_id text
) RETURNS TABLE(purchase_id uuid, already_completed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.purchases%ROWTYPE;
  _profile_rows integer;
BEGIN
  IF NULLIF(_capture_id, '') IS NULL THEN
    RAISE EXCEPTION 'capture_id_missing';
  END IF;
  IF NULLIF(_merchant_id, '') IS NULL THEN
    RAISE EXCEPTION 'merchant_id_missing';
  END IF;

  SELECT * INTO _row
  FROM public.purchases
  WHERE id = _purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_not_found';
  END IF;

  IF _row.status = 'completed' THEN
    IF _row.paypal_capture_id IS DISTINCT FROM _capture_id THEN
      RAISE EXCEPTION 'capture_mismatch';
    END IF;
    IF _row.paypal_payee_merchant_id IS DISTINCT FROM _merchant_id THEN
      RAISE EXCEPTION 'merchant_mismatch';
    END IF;
    RETURN QUERY SELECT _row.id, true;
    RETURN;
  END IF;

  IF _row.status <> 'pending' THEN
    RAISE EXCEPTION 'purchase_not_pending';
  END IF;

  IF _row.paypal_payee_merchant_id IS NULL
     OR _row.paypal_payee_merchant_id <> _merchant_id THEN
    RAISE EXCEPTION 'merchant_mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.purchases
    WHERE paypal_capture_id = _capture_id
      AND id <> _purchase_id
  ) THEN
    RAISE EXCEPTION 'capture_already_used';
  END IF;

  UPDATE public.profiles
  SET is_paid = true,
      paid_at = COALESCE(paid_at, now()),
      payment_amount = COALESCE(payment_amount, _row.expected_amount)
  WHERE id = _row.user_id;

  GET DIAGNOSTICS _profile_rows = ROW_COUNT;
  IF _profile_rows <> 1 THEN
    RAISE EXCEPTION 'profile_entitlement_not_granted';
  END IF;

  UPDATE public.purchases
  SET status = 'completed',
      paypal_capture_id = _capture_id,
      paypal_payee_merchant_id = _merchant_id,
      completed_at = now()
  WHERE id = _purchase_id;

  RETURN QUERY SELECT _row.id, false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_purchase(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_purchase(uuid, text, text)
  TO service_role;
