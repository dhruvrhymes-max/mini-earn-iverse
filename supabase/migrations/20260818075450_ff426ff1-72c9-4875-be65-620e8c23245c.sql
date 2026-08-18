CREATE OR REPLACE FUNCTION public.reserve_withdrawal(
  _tenant_id uuid,
  _user_id uuid,
  _amount numeric,
  _currency text,
  _network text,
  _wallet text
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user public.app_users%ROWTYPE;
  _tenant public.tenants%ROWTYPE;
  _tx public.transactions%ROWTYPE;
  _minimum numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount';
  END IF;
  IF _network NOT IN ('usdt_bep20', 'usdt_polygon', 'gram_ton') THEN
    RAISE EXCEPTION 'Unsupported withdrawal token';
  END IF;
  IF _wallet IS NULL OR length(trim(_wallet)) < 10 OR length(trim(_wallet)) > 120 THEN
    RAISE EXCEPTION 'Invalid destination address';
  END IF;

  SELECT * INTO _tenant FROM public.tenants WHERE id = _tenant_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bot not found'; END IF;
  _minimum := COALESCE((_tenant.economics->>'min_withdraw_usdt')::numeric, 0.1);
  IF _amount < _minimum THEN
    RAISE EXCEPTION 'Minimum withdrawal is % USDT', _minimum;
  END IF;

  SELECT * INTO _user FROM public.app_users
  WHERE id = _user_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF _user.banned THEN RAISE EXCEPTION 'Account is blocked'; END IF;
  IF _user.usd_balance < _amount THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;

  UPDATE public.app_users
  SET usd_balance = usd_balance - _amount
  WHERE id = _user.id;

  INSERT INTO public.transactions (tenant_id, user_id, type, amount, currency, status, wallet, network)
  VALUES (_tenant_id, _user_id, 'withdraw', _amount, _currency, 'pending', trim(_wallet), _network)
  RETURNING * INTO _tx;
  RETURN _tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_withdrawal(_transaction_id uuid, _tenant_id uuid)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tx public.transactions%ROWTYPE;
BEGIN
  UPDATE public.transactions
  SET status = 'approved'
  WHERE id = _transaction_id
    AND tenant_id = _tenant_id
    AND type = 'withdraw'
    AND status = 'pending'
  RETURNING * INTO _tx;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal is already being processed or completed'; END IF;
  RETURN _tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_withdrawal_claim(_transaction_id uuid, _tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.transactions
  SET status = 'pending'
  WHERE id = _transaction_id AND tenant_id = _tenant_id AND type = 'withdraw' AND status = 'approved';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_withdrawal(_transaction_id uuid, _tenant_id uuid, _tx_hash text)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tx public.transactions%ROWTYPE;
BEGIN
  IF _tx_hash IS NULL OR length(trim(_tx_hash)) = 0 THEN RAISE EXCEPTION 'Transaction hash is required'; END IF;
  UPDATE public.transactions
  SET status = 'paid', tx_hash = trim(_tx_hash), reject_reason = NULL
  WHERE id = _transaction_id AND tenant_id = _tenant_id AND type = 'withdraw' AND status = 'approved'
  RETURNING * INTO _tx;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal is not in processing state'; END IF;
  RETURN _tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(_transaction_id uuid, _tenant_id uuid, _reason text)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tx public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO _tx FROM public.transactions
  WHERE id = _transaction_id AND tenant_id = _tenant_id AND type = 'withdraw'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _tx.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal is already being processed or completed'; END IF;

  UPDATE public.transactions
  SET status = 'rejected', reject_reason = COALESCE(NULLIF(trim(_reason), ''), 'Rejected by admin')
  WHERE id = _tx.id
  RETURNING * INTO _tx;

  UPDATE public.app_users
  SET usd_balance = usd_balance + _tx.amount
  WHERE id = _tx.user_id AND tenant_id = _tenant_id;
  RETURN _tx;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_withdrawal(uuid, uuid, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_withdrawal(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_withdrawal_claim(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_withdrawal(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_withdrawal(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_withdrawal(uuid, uuid, numeric, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_withdrawal(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_withdrawal_claim(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_withdrawal(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, uuid, text) TO service_role;