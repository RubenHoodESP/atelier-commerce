# Interview evidence to build

This file is a preparation checklist, not a claim of completed work.

| Topic | Evidence to prepare | Follow-up to rehearse |
| --- | --- | --- |
| Next/React | Server-rendered product + small interactive cart | Why this server/client boundary? What reaches the browser? |
| Alokai | Real SDK method -> custom integration -> provider | Which code belongs to Alokai, and which did you write? |
| Express | Validation/error handling and provider routes | What happens if middleware does not respond or call next? |
| Composable architecture | Independent commerce/content adapters | Cost of another boundary? How would a provider change affect UI? |
| Testing | Price, stock race, idempotency and provider failure tests | Which defects could these tests miss? |
| Performance | Measured before/after for one change | Cache invalidation? Private-data leaks? Measurement conditions? |
| Security | Server pricing, input boundaries and secret placement | Why does a hidden button not provide authorization? |
| Collaboration | Small commits and short ADRs | What did you simplify and what would need redesign for production? |

For each feature explain: need -> constraints -> alternatives -> choice -> implementation -> verification -> limitations. Practise a five-minute English demo and a small unassisted change (add a filter, debug a timeout, alter a stock rule). Identify where AI helped and how you checked its output. Never describe a mock or a planned milestone as a production integration.
