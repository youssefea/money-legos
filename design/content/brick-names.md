# Brick names (v9)

Printed label = the plainest 1-2 word name a stranger understands at a glance. Board sublabel = the Base
product term, only where it teaches something. Tray px = printed size at the tray's 24px stud, measured
with Base Sans Bold (target >= 12px, heroes >= 14px). Footprints are [width x depth] in studs; only the
five existing sizes are used (2x1, 4x1, 2x2, 3x2, 4x2).

| id | old verb | new label | board sublabel | footprint change | tray px | why |
|---|---|---|---|---|---|---|
| b20 | Issue | Token | B20 | — | 21 | Your own token (stablecoin or tokenized asset); B20 is the standard |
| payments | Pay | Payments | — | — | 18.3 | Accept payments at checkout, hold, refund |
| financing | Grow | Earn | — | — | 21 | Earn vaults on idle balances; what most people want from it |
| validity | Trade | Limit orders | Validity tx | — | 15 | Orders that only go through while your price holds |
| speed | Speed | Instant | 200ms blocks | — | 21 | Five blocks a second, so things feel instant |
| base-pay | Tap | Checkout | Base Pay | 2x2 → 3x2 | 14.1 | USDC checkout in a few lines |
| escrow | Hold | Escrow | — | — | 16.8 | Hold funds, then capture |
| subscriptions | Recur | Subscriptions | — | 2x2 → 4x2 | 13.7 | Charge every month |
| refunds | Return | Refunds | — | 2x1 → 4x1 | 16.8 | Send money back |
| payouts | Pay out | Payouts | — | — | 16.8 | Pay many people at once |
| splits | Split | Revenue split | — | 2x2 → 4x2 | 14.1 | Share each sale across recipients |
| reconcile | Track | Tracking | — | — | 15.8 | Know what got paid, and build the report |
| memos | Tag | Notes | Memos | — | 14.2 | A note on every transfer, to match orders and invoices |
| private-ledgers | Hide | Privacy | Base Ledgers | — | 16.8 | Business payments kept off public explorers |
| allowlist | Allow | Allowlist | — | 2x2 → 3x2 | 15.8 | Only approved accounts can hold the token |
| freeze | Freeze | Freeze | — | — | 12.4 | Stop one account and recover its balance |
| pause | Pause | Pause | — | — | 13.9 | A stop button for incidents |
| multiplier | Scale | Stock splits | B20 multiplier | — | 16.3 | Stock splits shown right, without rewriting balances |
| swaps | Swap | Swaps | — | — | 12.5 | Trade one token for another |
| borrow | Borrow | Borrow | — | — | 16.8 | Borrow against what you hold |
| stocks | List | Stock data | Tokenized stocks | — | 12.8 | Read-only data on tokenized stocks |
| verify | Verify | Verify | Base Verify | — | 14.3 | Prove you are a real person |
| verify-onchain | Gate | Humans only | Base Verify | 2x1 → 4x1 | 14.8 | One real person, one claim, checked in the contract |
| basenames | Name | Names | Basenames | 2x2 → 3x2 | 16.8 | A name instead of 0x... |
| connect-wallet | Sign in | Wallet | — | — | 13.1 | Connect a wallet |
| batch-calls | Batch | Batch calls | Base Transactions | — | 16.8 | Many steps, one tap |
| sponsored-gas | Cover | No gas fees | Base Transactions | 2x1 → 4x1 | 16.3 | You pay the network fees for users |
| bridge | Bridge | Bridge | — | — | 16.8 | Bring funds in from other chains |
| flashblocks | Alert | Fast confirm | Flashblocks | 2x1 → 4x1 | 15.1 | A heads-up in 200ms that a transaction will land |
| basetime | Time | Exact time | BaseTime | 2x1 → 4x1 | 16.8 | Clocks to the millisecond |
| builder | Credit | Attribution | Builder Codes | 2x1 → 4x1 | 16.8 | Get credit for the activity your app drives |
| live-stream | Stream | Live updates | — | — | 14.9 | Updates the moment they land, no polling |
| x402-api | Sell | Paid API | x402 | 2x2 → 3x2 | 16.5 | Charge for each API call |
| usage-billing | Meter | Pay per use | x402 | 2x2 → 4x2 | 16.6 | Pay only for what you use |
| agent-spend | Limit | Agent budget | x402 | 2x1 → 4x1 | 13.9 | An allowance your agent cannot overspend |
| agent-codes | Enroll | Agent codes | Builder Codes | 2x1 → 4x1 | 15.1 | Your agent's transactions are credited to you |
| docs-mcp | Ask | AI docs | MCP | 2x1 → 4x1 | 16.8 | Your AI assistant reads current Base docs |
| skills | Teach | AI skills | — | 2x1 → 4x1 | 16.8 | Ready-made Base recipes for your AI agent |
| local-devnet | Fork | Local Base | Devnet | 2x1 → 4x1 | 16.8 | Base on your laptop |

Notes
- All 39 labels are unique. Approved with edits: splits is "Revenue split" (no shared word with Stock splits),
  agent-codes is "Agent codes" ("Agent credit" read like a loan), b20 stays "Token".
- "Limit orders" is the longest hero label: 15px at the 24px stud. The new left column keeps the hero
  stud at 24px so it stays >= 14px.
- 18 bricks get a wider footprint: the tray grid gets longer, but no label is abbreviated.
