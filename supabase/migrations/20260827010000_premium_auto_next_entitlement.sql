-- Premium entitlement is authoritative for automatic clue advancement.
-- Reset legacy preferences before installing the invariant.
UPDATE public.profiles
SET auto_next = false
WHERE auto_next = true
  AND is_paid = false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_auto_next_requires_paid;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_auto_next_requires_paid
  CHECK (auto_next = false OR is_paid = true);

-- Payment fields may only be changed by trusted server-side operations.
CREATE OR REPLACE FUNCTION public.protect_profile_payment_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated')
     AND (
       NEW.is_paid IS DISTINCT FROM OLD.is_paid
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.payment_amount IS DISTINCT FROM OLD.payment_amount
     ) THEN
    RAISE EXCEPTION 'payment_entitlement_read_only';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_payment_entitlement ON public.profiles;
CREATE TRIGGER profiles_protect_payment_entitlement
  BEFORE UPDATE OF is_paid, paid_at, payment_amount ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_payment_entitlement();
