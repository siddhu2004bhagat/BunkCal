-- ============================================================
-- Migration: 2-way proxy ledger RPCs
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Ensure counterpart_user_id column exists on proxy_ledger
ALTER TABLE proxy_ledger
  ADD COLUMN IF NOT EXISTS counterpart_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proxy_ledger_counterpart
  ON proxy_ledger(counterpart_user_id);

-- ============================================================
-- 2. add_proxy_contact
--    Creates a ledger entry for the caller AND a mirror entry
--    for the counterpart user — atomically, bypassing RLS.
--
--    Returns: UUID of the caller's new ledger row
-- ============================================================
CREATE OR REPLACE FUNCTION add_proxy_contact(
  p_user_id           UUID,
  p_contact_name      TEXT,
  p_contact_email     TEXT DEFAULT NULL,
  p_counterpart_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_ledger_id      UUID;
  v_mirror_ledger_id  UUID;
  v_my_display_name   TEXT;
BEGIN
  -- Insert caller's ledger entry
  INSERT INTO proxy_ledger (user_id, contact_name, contact_email, balance, counterpart_user_id)
  VALUES (p_user_id, p_contact_name, p_contact_email, 0, p_counterpart_user_id)
  RETURNING id INTO v_my_ledger_id;

  -- If linked to a real user, create the mirror entry on their side
  IF p_counterpart_user_id IS NOT NULL THEN
    -- Check if mirror already exists (avoid duplicates)
    SELECT id INTO v_mirror_ledger_id
    FROM proxy_ledger
    WHERE user_id = p_counterpart_user_id
      AND counterpart_user_id = p_user_id
    LIMIT 1;

    IF v_mirror_ledger_id IS NULL THEN
      -- Get caller's display name for the mirror entry
      SELECT COALESCE(full_name, bunkwise_id, 'Unknown')
      INTO v_my_display_name
      FROM profiles
      WHERE user_id = p_user_id
      LIMIT 1;

      INSERT INTO proxy_ledger (user_id, contact_name, balance, counterpart_user_id)
      VALUES (p_counterpart_user_id, v_my_display_name, 0, p_user_id)
      RETURNING id INTO v_mirror_ledger_id;

      -- Notify the counterpart that someone added them
      INSERT INTO notifications (user_id, title, message, type, read)
      VALUES (
        p_counterpart_user_id,
        '🤝 Added to Proxy Ledger',
        v_my_display_name || ' added you to their proxy ledger. You can now track proxies together!',
        'proxy',
        false
      );
    END IF;
  END IF;

  RETURN v_my_ledger_id;
END;
$$;

-- ============================================================
-- 3. record_proxy_transaction
--    Records a transaction for the caller, updates their balance,
--    and if the ledger entry is linked to a counterpart:
--      - finds or creates the mirror ledger entry
--      - inserts the mirror transaction (flipped type)
--      - updates the mirror balance
--      - sends a notification to the counterpart
--
--    Returns: UUID of the caller's new transaction row
-- ============================================================
CREATE OR REPLACE FUNCTION record_proxy_transaction(
  p_user_id    UUID,
  p_ledger_id  UUID,
  p_type       TEXT,   -- 'gave' | 'received'
  p_classes    INT,
  p_subject    TEXT DEFAULT NULL,
  p_notes      TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn_id              UUID;
  v_ledger              RECORD;
  v_delta               INT;
  v_mirror_type         TEXT;
  v_mirror_delta        INT;
  v_mirror_ledger_id    UUID;
  v_mirror_balance      INT;
  v_my_display_name     TEXT;
  v_notif_action        TEXT;
BEGIN
  -- Fetch the caller's ledger entry
  SELECT * INTO v_ledger
  FROM proxy_ledger
  WHERE id = p_ledger_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger entry not found or access denied';
  END IF;

  -- Insert the transaction for the caller
  INSERT INTO proxy_transactions (user_id, ledger_id, type, classes, subject, notes)
  VALUES (p_user_id, p_ledger_id, p_type, p_classes, p_subject, p_notes)
  RETURNING id INTO v_txn_id;

  -- Update caller's ledger balance
  v_delta := CASE WHEN p_type = 'gave' THEN p_classes ELSE -p_classes END;
  UPDATE proxy_ledger
  SET balance = balance + v_delta, updated_at = NOW()
  WHERE id = p_ledger_id;

  -- Mirror to counterpart if linked
  IF v_ledger.counterpart_user_id IS NOT NULL THEN
    v_mirror_type  := CASE WHEN p_type = 'gave' THEN 'received' ELSE 'gave' END;
    v_mirror_delta := CASE WHEN v_mirror_type = 'gave' THEN p_classes ELSE -p_classes END;

    -- Find or create mirror ledger entry
    SELECT id, balance INTO v_mirror_ledger_id, v_mirror_balance
    FROM proxy_ledger
    WHERE user_id = v_ledger.counterpart_user_id
      AND counterpart_user_id = p_user_id
    LIMIT 1;

    IF v_mirror_ledger_id IS NULL THEN
      -- Get caller's display name
      SELECT COALESCE(full_name, bunkwise_id, 'Unknown')
      INTO v_my_display_name
      FROM profiles
      WHERE user_id = p_user_id
      LIMIT 1;

      INSERT INTO proxy_ledger (user_id, contact_name, balance, counterpart_user_id)
      VALUES (v_ledger.counterpart_user_id, v_my_display_name, 0, p_user_id)
      RETURNING id, balance INTO v_mirror_ledger_id, v_mirror_balance;
    END IF;

    -- Insert mirror transaction
    INSERT INTO proxy_transactions (user_id, ledger_id, type, classes, subject, notes)
    VALUES (v_ledger.counterpart_user_id, v_mirror_ledger_id, v_mirror_type, p_classes, p_subject, p_notes);

    -- Update mirror balance
    UPDATE proxy_ledger
    SET balance = balance + v_mirror_delta, updated_at = NOW()
    WHERE id = v_mirror_ledger_id;

    -- Get caller's display name for notification (may already be fetched above)
    IF v_my_display_name IS NULL THEN
      SELECT COALESCE(full_name, bunkwise_id, 'Unknown')
      INTO v_my_display_name
      FROM profiles
      WHERE user_id = p_user_id
      LIMIT 1;
    END IF;

    -- Notify counterpart
    v_notif_action := CASE
      WHEN p_type = 'gave'
        THEN ' did a proxy for you — ' || p_classes || ' class' || CASE WHEN p_classes != 1 THEN 'es' ELSE '' END || ' credited'
      ELSE
        ' recorded that you owe them ' || p_classes || ' proxy class' || CASE WHEN p_classes != 1 THEN 'es' ELSE '' END
    END;

    INSERT INTO notifications (user_id, title, message, type, read)
    VALUES (
      v_ledger.counterpart_user_id,
      '🤝 Proxy Update',
      v_my_display_name || v_notif_action,
      'proxy',
      false
    );
  END IF;

  RETURN v_txn_id;
END;
$$;

-- ============================================================
-- 4. Grant execute to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION add_proxy_contact(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_proxy_transaction(UUID, UUID, TEXT, INT, TEXT, TEXT) TO authenticated;
