# Reliable TON payout and distinct theme experiences

## Goal
Process the pending Bakery Rush TON withdrawal safely, then replace the shared five-family presentation with a gameplay- and preset-specific system for every preset except Bakery Rush, whose current experience stays unchanged.

## TON payout reliability
- Replace burst RPC calls with paced, endpoint-aware reads and failover for balance, wallet state, sequence number, and confirmation.
- Resolve the wallet version before broadcast, pin the chosen endpoint for the transfer, and confirm across healthy endpoints without rebroadcasting.
- Preserve the database claim lock; if broadcast acceptance is uncertain, keep the withdrawal in a non-retryable processing state rather than returning it to pending.
- Test wallet reads first, then process exactly the oldest pending Bakery Rush TON request and save its real transaction hash. Do not process the second duplicate request.

## Theme redesign
- Keep Bakery Rush unchanged.
- Define a per-preset experience profile for all other presets: page composition, earning control shape, vocabulary, navigation destinations, quick actions, balance treatment, motion, and admin skin.
- Make navigation contextual. For example, calendar/check-in removes Marketplace and foregrounds Calendar/Streak/Rewards; scratch foregrounds Tickets/Prizes; quiz foregrounds Rounds/Streak/Rank; forecast foregrounds Market/History; miners/market remain only where they fit.
- Split shared mode logic from preset renderers so rewards and security remain consistent while every preset can have a visibly different UI.
- Give related presets different compositions and controls, not only different colors: fishing rod/catch log, lumber trail, ore elevator, reactor console, orbit map, grove plots, forge belt, dive gauge, candy board, cyber terminal, rune dial, arcade cabinet, roastery queue, farm plots, caravan route, scratch ticket, quiz stage, calendar, and market board.
- Add a lighter preset-specific skin to the in-app admin (header, tabs, section geometry, labels) while preserving all admin capabilities.

## Verification
- Verify the payout state and transaction hash in the database and on the returned explorer URL.
- Exercise representative presets from every game mode on a 360px mobile viewport, checking navigation relevance, button differences, no overlaps, and Bakery Rush regression safety.
- Confirm the app build and runtime logs are clean.

## Technical details
- Introduce declarative preset experience metadata rather than duplicating 32 full page components.
- Use semantic global tokens for new visual roles; preset colors continue through the existing tenant theme configuration.
- Keep payout execution server-only and never expose wallet phrases or RPC credentials.
