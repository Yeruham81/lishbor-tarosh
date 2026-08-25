CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paypal',
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','canceled','failed')),
  expected_amount numeric(12,2) NOT NULL CHECK (expected_amount > 0),
  expected_currency text NOT NULL,
  invoice_id text NOT NULL UNIQUE,
  paypal_order_id text UNIQUE,
  paypal_capture_id text UNIQUE,
  paypal_payee_merchant_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX purchases_user_id_idx ON public.purchases(user_id);
CREATE INDEX purchases_status_idx ON public.purchases(status);

GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchases_select_own ON public.purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY purchases_no_insert ON public.purchases
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY purchases_no_update ON public.purchases
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY purchases_no_delete ON public.purchases
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

CREATE TRIGGER purchases_touch_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

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
BEGIN
  SELECT * INTO _row FROM public.purchases WHERE id = _purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_not_found';
  END IF;

  IF _row.status = 'completed' THEN
    IF _row.paypal_capture_id IS DISTINCT FROM _capture_id THEN
      RAISE EXCEPTION 'capture_mismatch';
    END IF;
    RETURN QUERY SELECT _row.id, true;
    RETURN;
  END IF;

  IF _row.status <> 'pending' THEN
    RAISE EXCEPTION 'purchase_not_pending';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.purchases
    WHERE paypal_capture_id = _capture_id AND id <> _purchase_id
  ) THEN
    RAISE EXCEPTION 'capture_already_used';
  END IF;

  UPDATE public.purchases
  SET status = 'completed',
      paypal_capture_id = _capture_id,
      paypal_payee_merchant_id = COALESCE(_merchant_id, paypal_payee_merchant_id),
      completed_at = now()
  WHERE id = _purchase_id;

  UPDATE public.profiles
  SET is_paid = true,
      paid_at = COALESCE(paid_at, now()),
      payment_amount = COALESCE(payment_amount, _row.expected_amount)
  WHERE id = _row.user_id;

  RETURN QUERY SELECT _row.id, false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_purchase(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_purchase(uuid, text, text) TO service_role;