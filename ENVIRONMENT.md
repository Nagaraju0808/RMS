# Environment variables (settings)

Put these in a file called `.env` (copy `.env.example`), or set them in your server / Docker.
**Never commit real secrets to git.**

| Name | Needed? | Example | What it does |
|---|---|---|---|
| `DATABASE_URL` | **yes** | `postgresql://dineflow:STRONGPASS@localhost:5432/dineflow` | Where the PostgreSQL database is. |
| `JWT_SECRET` | **yes (production)** | output of `openssl rand -hex 32` | Signs logins. Must be long and random. The app refuses to start in production without a proper one. Changing it logs everyone out. |
| `PUBLIC_URL` | recommended | `https://order.spicegarden.in` | The address customers use. Printed in table QR codes. If empty, the address of the current request is used. |
| `APP_TZ` | no (default `Asia/Kolkata`) | `Asia/Dubai` | Restaurant time zone for day-end, tokens and reports. Also set `TZ` to the same value on the server. |
| `PORT` | no (default 3000) | `3000` | Port the app listens on. |
| `PAYMENT_GATEWAY` | no (default `mock`) | `razorpay` | `mock` = pretend online payments (for testing). `razorpay` = Razorpay **test mode**. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | only with Razorpay | `rzp_test_…` | Razorpay keys. Only `rzp_test_` keys are accepted (live payments are switched off until the app is fully checked). |
| `MESSAGE_PROVIDER` | no (default `mock`) | `mock` | SMS / WhatsApp / email sender. `mock` saves messages in the Message log instead of sending. |
| `AI_PROVIDER` | no (default `off`) | `anthropic` | Turns on AI explanations in Smart insights. Everything works with it off. |
| `ANTHROPIC_API_KEY` | only with AI on | `sk-ant-…` | Key for Claude. |
| `AI_MODEL` | no | `claude-opus-5-5` | Which Claude model writes the explanations. |
| `AGGREGATOR_SECRET` | if Swiggy/Zomato webhooks are used | long random text | Shared secret the platform sends in `x-aggregator-secret`. |
| `DEMO_LOGIN` | **keep `0`** | `0` | Development only: `1` enables a demo login link for screenshots. Never works in production. |
