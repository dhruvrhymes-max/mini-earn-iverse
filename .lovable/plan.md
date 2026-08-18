# Secure Withdrawal and Automated Payout Flow

## Goal
Make withdrawal requests use a manually entered destination and a fixed token choice, execute real EVM/TON payments only on admin approval, and notify the user/payment channel at each allowed stage.

## Changes
1. **Withdrawal request UI**
   - Replace Network with **Select token**: USDT BEP20, USDT POL, and GRAM (TON).
   - Ask for the destination address directly on each request and validate it by chain.
   - Remove the saved wallet-address entry from Profile and replace it with a useful finance shortcut.

2. **Secure withdrawal accounting**
   - Add database functions that atomically reserve the user’s USDT balance when creating a withdrawal and atomically refund it on rejection.
   - Bind requests to validated Telegram identity and tenant instead of trusting a browser-supplied user UUID.
   - Lock processing so repeated/double clicks cannot pay or refund the same request twice.

3. **Real payout execution**
   - Rename “Mark paid” to **Approve & send**.
   - Configure independent Polygon USDT, BEP20 USDT, and TON/GRAM payout settings so each token uses the correct RPC, contract, decimals, explorer, and encrypted signing credential.
   - Use sensible public TON endpoint/explorer defaults; retain an optional API key for higher rate limits.
   - Broadcast first, save the real transaction hash, and show provider errors without falsely marking a request paid.

4. **Telegram notifications and payment channel**
   - Notify the user’s tenant bot when a request is submitted, paid, or rejected.
   - Post **requested** and **paid** records to the configured payment channel; do not post rejected requests.
   - Prefer an active platform check bot for channel posts, with tenant-bot fallback, and report configuration/posting failures to admins.

5. **Security hardening**
   - Replace read-then-write reward/balance mutations in the withdrawal path with atomic database operations.
   - Validate tenant ownership/admin scope on every processing call and prevent cross-tenant user/transaction access.
   - Add clear pending/processing states and disable repeat actions.

## Technical details
- Add a migration with RPC functions and grants for authenticated/service roles; preserve RLS.
- Keep signing secrets encrypted and server-only.
- Use token identifiers (`usdt_bep20`, `usdt_polygon`, `gram_ton`) consistently while retaining compatibility for existing pending rows.
- Update both web-admin and in-app admin withdrawal controls/settings.
- Verify with focused tests/type checks and a mobile live-preview pass.
