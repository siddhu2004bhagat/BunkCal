-- ============================================================
-- Fix: Mirror proxy transactions between users
-- When User A records a proxy for User B, User B's ledger
-- should automatically reflect the opposite balance.
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add counterpart_user_id to proxy_ledger (who this contact actually is)
ALTER TABLE proxy_ledger ADD COLUMN IF NOT EXISTS counterpart_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add counterpart_user_id to proxy_transactions
ALTER TABLE proxy_transactions ADD COLUMN IF NOT EXISTS counterpart_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_proxy_ledger_counterpart ON proxy_ledger(counterpart_user_id);

-- 4. Function to mirror a proxy transaction to the other user's ledger
CREATE OR REPLACE FUNCTION mirror_proxy_transaction()
RETURNS TRIGGER AS $$
DECLARE
  counterpart_uid UUID;
  mirror_ledger_id UUID;
  mirror_type TEXT;
  sender_name TEXT;
BEGIN
  -- Only mirror if we know who the counterpart is
  counterpart_uid := NEW.counterpart_user_id;
  IF counterpart_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the sender's name
  SELECT COALESCE(full_name, bunkwise_id, 'Someone') INTO sender_name
  FROM profiles WHERE user_id = NEW.user_id;

  -- Mirror type: if sender "gave" a proxy, receiver "received" one
  IF NEW.type = 'gave' THEN
    mirror_type := 'received';
  ELSE
    mirror_type := 'gave';
  END IF;

  -- Find or create the mirror ledger entry on the counterpart's side
  SELECT id INTO mirror_ledger_id
  FROM proxy_ledger
  WHERE user_id = counterpart_uid AND counterpart_user_id = NEW.user_id
  LIMIT 1;

  IF mirror_ledger_id IS NULL THEN
    -- Create a new ledger entry for the counterpart
    INSERT INTO proxy_ledger (user_id, contact_name, counterpart_user_id, balance)
    VALUES (counterpart_uid, sender_name, NEW.user_id, 0)
    RETURNING id INTO mirror_ledger_id;
  END IF;

  -- Insert the mirror transaction
  INSERT INTO proxy_transactions (user_id, ledger_id, type, classes, subject, notes, counterpart_user_id)
  VALUES (counterpart_uid, mirror_ledger_id, mirror_type, NEW.classes, NEW.subject, NEW.notes, NEW.user_id);

  -- Update the mirror ledger balance
  UPDATE proxy_ledger
  SET balance = balance + (CASE WHEN mirror_type = 'gave' THEN NEW.classes ELSE -NEW.classes END),
      updated_at = NOW()
  WHERE id = mirror_ledger_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on proxy_transactions INSERT
DROP TRIGGER IF EXISTS on_proxy_transaction_insert ON proxy_transactions;
CREATE TRIGGER on_proxy_transaction_insert
  AFTER INSERT ON proxy_transactions
  FOR EACH ROW
  WHEN (NEW.counterpart_user_id IS NOT NULL)
  EXECUTE FUNCTION mirror_proxy_transaction();

-- 6. Update RLS on proxy_ledger to allow reading mirror entries
DROP POLICY IF EXISTS "Users can view own ledger" ON proxy_ledger;
CREATE POLICY "Users can view own ledger" ON proxy_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 7. Allow the trigger function to insert into proxy_ledger and proxy_transactions
-- (SECURITY DEFINER handles this)

-- Verify
SELECT 'proxy_ledger columns' as info, column_name 
FROM information_schema.columns 
WHERE table_name = 'proxy_ledger' AND column_name = 'counterpart_user_id';
