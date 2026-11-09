# ClearCart

Describe an everyday task and a budget. ClearCart suggests an explained cart, accounts for items you already own, and lets you approve a PayPal **sandbox** checkout. The catalog contains 32 original synthetic products with illustrative prices; no real goods are sold or shipped.

Built as a candidate entry for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/). The submission deadline is **November 12, 2026 at noon Pacific**. This is a judged competition; completing this prototype does not earn a payment. No entry or award has been secured.

## Run it

Install [Node.js](https://nodejs.org/) 22 or newer, open a terminal in this folder, then run:

```sh
npm ci
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:3000`. Planning works immediately without credentials, GPU, or a paid AI subscription. The only installed dependency is the development bundler; runtime code uses standard JavaScript APIs.

## Connect your own PayPal sandbox in the app

1. Follow [the account instructions](docs/ELIGIBILITY.md#free-account-setup) to create a free PayPal Developer account and sandbox app.
2. Open [the private ClearCart app](https://clearcart-budget-lab.esteemeddeer4.chatgpt.site), expand **Connect PayPal sandbox**, and enter the app's **sandbox** client ID and client secret directly in that form. These are API credentials, not your PayPal account password. Never send them in chat.
3. Select **Connect sandbox for this browser**. The server exchanges the credentials directly with PayPal's sandbox and discards the client secret. An HttpOnly, Secure, SameSite=Lax cookie holds the access token for at most one hour. Make a plan, review it, select **Continue to PayPal sandbox**, and approve with a **personal sandbox buyer account**. Use the sandbox buyer login from the Developer dashboard, not your real account payment credentials.
4. After returning to ClearCart, select **Complete sandbox payment**. Confirm the test transaction in PayPal's sandbox dashboard. A success message is shown only for a completed capture with the expected USD amount.

The temporary connection is scoped to this browser. Disconnecting clears its cookie, but does not revoke the PayPal token at the provider or cancel an existing order. Reconnecting starts a new connection; an old saved checkout must not be reused. The app does not store these credentials in a database, environment settings, browser JavaScript storage, URLs, or application logs. It preserves Sites' existing owner-private authentication.

For local development, the same form works on `http://127.0.0.1:3000` with an HttpOnly loopback cookie. Alternatively, copy `.env.example` to the ignored `.env` file, set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, and restart the server. Server-configured credentials take precedence over browser connections. `APP_ORIGIN` can optionally fix the HTTPS callback origin. The API host is hard-coded to PayPal's sandbox; this code has no live-payment switch.

## What is implemented

- A multinomial Naive Bayes classifier trained at startup on 48 original AI-assisted synthetic examples, covering cooking, study, basic hand tools, and portable lighting.
- Exact enumeration of category choices to maximize predefined need coverage within an integer-cent budget; ties favor lower cost. This is a narrow, inspectable prototype, not a general shopping agent or retail-price search engine.
- Unsupported, weak, or negated requests decline instead of producing a misleading cart. Detailed preferences and mixed tasks are not reliably understood. Model scores are uncalibrated.
- Catalog prices recalculated on the server, signed expiring checkout state, stable PayPal request IDs, explicit buyer approval, and capture amount/status checks.
- Responsive interface, owned-item selection, downloadable plans, and stale-cart handling when inputs change during an in-flight request.

## Verification and limits

See [VERIFICATION.md](docs/VERIFICATION.md) for executed checks and deployment status. Tests simulate PayPal responses. **A genuine PayPal sandbox transaction is still pending the user's sandbox connection and buyer approval.** There is no claim of a completed payment or contest-ready submission.

Browser-based visual QA is pending because the managed Sites browser-control tool is unavailable in the build environment. UI event behavior is tested with a small Node DOM fixture; this is not a substitute for testing the page in a real browser.

The project has no production merchant inventory, taxes, shipping, fulfillment, refunds, durable order ledger, or public-service abuse controls. Use it as a sandbox demonstration. The current Site is owner-private. The contest always requires a public, openly licensed source repository. Judges also need either complete run instructions or an accessible working demo; a hosted demo does not replace the public-source requirement.

## Submission materials

- [Eligibility, accounts, and submission checklist](docs/ELIGIBILITY.md)
- [Draft Devpost description](docs/SUBMISSION_DRAFT.md)
- [Short demo script](docs/DEMO_SCRIPT.md)
- [Official source links](docs/SOURCES.md)

Before submitting: verify personal eligibility, join Devpost, test a real sandbox transaction, publish the source with this MIT license, record a public YouTube demo under three minutes, and submit the entry. The draft contains placeholders so incomplete steps cannot be mistaken for verified results.

## Hosting and architecture

`lib/app.mjs` is the shared request handler. `scripts/serve.mjs` adapts it to Node HTTP. `scripts/build.mjs` bundles it with the frontend into `dist/server/index.js`, a dependency-free Worker ES module exposing `fetch(request, env)`.

`.openai/hosting.json` identifies this private Sites deployment. A separate deployment must register its own Site identity; do not reuse the owner's project ID. For conventional Node hosting, run `npm run dev`, set a host/port appropriate to your platform, and supply secrets through that platform.

ChatGPT/Codex assisted with research, code, tests, training examples, and documentation. The runtime AI is the included classifier. Review the code and behavior before representing this project in an entry.
