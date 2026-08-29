# Run Doc — Homelab & Network Ops Center (Frontend Preview)

## How to Reproduce the Artifacts

1. Copy `.env.local` from the main checkout into `frontend/`:
   ```
   copy ..\.env.example frontend\.env.local  (then edit values as needed)
   ```
   The `.env.local` file is already committed in the worktree with placeholder Firebase values.

2. Install npm dependencies:
   ```
   cd frontend && npm install
   ```

## How to Run the Dev Server

```bash
cd frontend
npx next dev -p 3000
```

- **URL:** http://localhost:3000
- **Port:** 3000 (default Next.js port)
- **Output log:** `E:\Engprogram\homelab\.freebuff\preview-2241b928-e8c7-416a-b3c7-74a117606f53.log`
- **stderr log:** append `.err` to the log path above

### Notes
- Firebase Auth is not configured — use **"Enter Demo Mode"** button on the login screen to view the full dashboard with mock data.
- The backend API is not running, so real-time data fetches fail gracefully (caught by `Promise.allSettled`). Demo mode bypasses API calls entirely.
- Next.js was upgraded from 14.0.4 → 14.2.15 to fix Firebase `#private` field parse errors.
- `optimizeCss: true` was disabled in `next.config.js` because it requires the `critters` package.
