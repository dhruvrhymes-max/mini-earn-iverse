-- Add referral config to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS referral_config jsonb NOT NULL DEFAULT '{
    "signup_reward": 0,
    "inviter_reward": 50,
    "lifetime_pct": 20,
    "require_activity": true,
    "activity_types": ["mine","task","ad"]
  }'::jsonb;

-- Per-user referral tracking
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS pending_inviter_reward numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_activity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifetime_earned_for_inviter numeric NOT NULL DEFAULT 0;