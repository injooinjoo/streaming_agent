-- Migration 002: Fix events table schema to match unified schema
-- This migration renames old columns and adds missing columns

-- Step 1: Check if old columns exist and rename them
DO $$
BEGIN
  -- Rename 'type' to 'event_type' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'type') THEN
    ALTER TABLE events RENAME COLUMN type TO event_type;
    RAISE NOTICE 'Renamed column type to event_type';
  END IF;

  -- Rename 'sender' to 'actor_nickname' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'sender') THEN
    ALTER TABLE events RENAME COLUMN sender TO actor_nickname;
    RAISE NOTICE 'Renamed column sender to actor_nickname';
  END IF;

  -- Rename 'timestamp' to 'event_timestamp' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'timestamp') THEN
    ALTER TABLE events RENAME COLUMN timestamp TO event_timestamp;
    RAISE NOTICE 'Renamed column timestamp to event_timestamp';
  END IF;
END $$;

-- Step 2: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add actor_person_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'actor_person_id') THEN
    ALTER TABLE events ADD COLUMN actor_person_id INTEGER;
    RAISE NOTICE 'Added column actor_person_id';
  END IF;

  -- Add actor_role
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'actor_role') THEN
    ALTER TABLE events ADD COLUMN actor_role VARCHAR(50);
    RAISE NOTICE 'Added column actor_role';
  END IF;

  -- Add target_person_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'target_person_id') THEN
    ALTER TABLE events ADD COLUMN target_person_id INTEGER;
    RAISE NOTICE 'Added column target_person_id';
  END IF;

  -- Add target_channel_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'target_channel_id') THEN
    ALTER TABLE events ADD COLUMN target_channel_id VARCHAR(255);
    RAISE NOTICE 'Added column target_channel_id';
  END IF;

  -- Add broadcast_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'broadcast_id') THEN
    ALTER TABLE events ADD COLUMN broadcast_id INTEGER;
    RAISE NOTICE 'Added column broadcast_id';
  END IF;

  -- Add original_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'original_amount') THEN
    ALTER TABLE events ADD COLUMN original_amount INTEGER;
    RAISE NOTICE 'Added column original_amount';
  END IF;

  -- Add currency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'currency') THEN
    ALTER TABLE events ADD COLUMN currency VARCHAR(10);
    RAISE NOTICE 'Added column currency';
  END IF;

  -- Add donation_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'donation_type') THEN
    ALTER TABLE events ADD COLUMN donation_type VARCHAR(50);
    RAISE NOTICE 'Added column donation_type';
  END IF;

  -- Add ingested_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ingested_at') THEN
    ALTER TABLE events ADD COLUMN ingested_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added column ingested_at';
  END IF;
END $$;

-- Step 3: Update indexes
DROP INDEX IF EXISTS idx_events_timestamp;
CREATE INDEX IF NOT EXISTS idx_events_event_timestamp ON events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_events_target_channel ON events(target_channel_id);
CREATE INDEX IF NOT EXISTS idx_events_target_type ON events(target_channel_id, event_type);

-- Step 4: Verify the schema
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'events' AND column_name = 'event_type';

  IF col_count = 0 THEN
    RAISE EXCEPTION 'Migration failed: event_type column not found';
  END IF;

  RAISE NOTICE 'Migration completed successfully';
END $$;
