# ClearCart — Optimized Devpost Submission Copy

> **DRAFT — NOT SUBMITTED.** Bracketed items below are pending proofs or final links; do not paste claims in square brackets into Devpost without completing those gates. Updated Nov 9, 2026. Preserve honesty about the limited prototype.

## Title
**ClearCart**

## Tagline
**From intention to intelligent checkout.**

## One-line hook
**Tell ClearCart what you need, what you can spend, and what you already own. It builds an explained plan you approve before PayPal sandbox checkout.**

## Inspiration

Shopping tools usually ask for products first. But people often start with a more human question: *I'm moving into my first apartment; what do I actually need to cook simple meals without exceeding $75?*

ClearCart explores a different starting point: the **goal**, the **limit**, and the things you **already own**. Instead of presenting a mysterious cart, it explains recommendations, shows tradeoffs and requires the user to make the final payment decision.

## What it does

ClearCart is a working web prototype for four intentionally limited starter tasks: a first kitchen, a study corner, basic hand tools, and portable lighting.

1. Describe an everyday task in plain language and enter a USD budget.
2. A small trained AI classifier maps the request to a supported task category or declines a weak/unsupported request.
3. A deterministic optimizer selects useful products from a 32-item synthetic demo catalog under the exact budget in integer cents.
4. View item-by-item reasons, total spend, remaining budget and needs that could not be covered.
5. Exclude items already owned and regenerate; adjust the budget and see how the cart changes.
6. When ready, initiate a **PayPal sandbox** checkout and approve it personally. The app verifies payment status and amount before reporting a completed capture. **[ONLY CLAIM COMPLETED LIVE SANDBOX VALIDATION IF ACTUALLY VERIFIED.]**

Products and prices are illustrative. No physical goods are sold or shipped, and no production payments are made.

## How it was built

**AI and decision logic.** A multinomial Naive Bayes classifier trains at startup on 48 original AI-assisted synthetic task examples. Its scores are not calibrated confidence probabilities. Exact enumeration chooses category items to maximize predefined need coverage under a hard integer-cent spending cap; less expensive solutions break ties. If a request is unsupported or negated, ClearCart prefers a truthful decline over a fabricated shopping plan. This is a constrained demo, not a general retail shopping agent.

**PayPal and payment integrity.** ClearCart uses PayPal Orders v2 in the **sandbox**. Checkout amounts come from the server-side catalog, not user-submitted prices. Orders are tied to signed, expiring state and stable request IDs. Buyer approval is explicit. After approval, the app checks the capture status and amount before displaying success. Sandbox credentials are exchanged server-side for a short-lived token, not stored in browser JavaScript storage.

**Interface and deployment.** The application uses JavaScript and a responsive task-first UI, with a shared request handler runnable in Node or bundled to a Worker. Codex/ChatGPT assisted with project research, code, tests, training examples and documentation. The runtime AI is the small trained classifier, not Codex itself.

## The difficult parts

The key engineering challenge was keeping the product honest and the checkout under the customer's control. The UI invalidates checkout when an in-flight planning request becomes stale. It separately manages expiring browser sandbox connections, server-derived amounts, signed checkout state and verification of the provider's response. Instead of pretending the synthetic products are real inventory, ClearCart explicitly labels the demonstration catalog.

## What we verified

The repository's November 9 verification record reports **52 automated test cases**, including planning, budget enforcement, catalog price integrity, payment handling and connection controls. Those PayPal test cases use simulated provider responses, not a real payment.

**[Insert the date and verified status of a genuine sandbox buyer-approval and completed capture, or clearly state pending. Never claim success until observed.]**

The deployed planning API was checked separately. The existing hosted Site was owner-private when documented. Judges can use the publicly accessible MIT-licensed source and reproducible run instructions; a truly public hosted demo should be linked only if verified.

## Potential impact

ClearCart is designed for the small, practical decisions where budgets matter: setting up a first kitchen, desk or tool kit. It demonstrates an experience where users can begin with what they want to accomplish, see an accountable spending plan and retain control of approval. Consumer savings, conversion improvements and broader intent-model reliability have **not** been measured.

## What is next

Expand support beyond four categories, evaluate the model on diverse user-written prompts, connect to licensed real merchant inventory and shipping/tax data, test with actual users, and add production payment and fulfillment infrastructure only after appropriate security and compliance work.

## Built with

JavaScript · Node.js · multinomial Naive Bayes · exact budget optimization · PayPal Orders v2 sandbox · Cloudflare Worker-compatible build · esbuild · Codex / ChatGPT development assistance

## Final project links and gate fields

- **Source:** https://github.com/XJR1984/XJR1984-clearcart (GitHub API reports PUBLIC as of Nov 9; verify unauthenticated access).
- **Run:** https://github.com/XJR1984/XJR1984-clearcart#run-it
- **Demo:** [Only include accessible public deployment if verified; existing owner-private Sites URL is not a judge-facing URL.]
- **YouTube:** [INSERT VERIFIED PUBLIC YOUTUBE URL, under 3 min]
- **Actual sandbox payment:** [DATE / VERIFIED PROVIDER CAPTURE / NON-SENSITIVE EVIDENCE OR PENDING]
- **Devpost:** [INSERT SUBMITTED ENTRY URL AND CONFIRMATION]

## Technical honesty / licensing disclosure

The runtime model is a small classifier trained on synthetic examples. The catalog contains synthetic products and illustrative prices; there are no live retail offers, production orders, or physical shipments. AI coding assistance was used to build the prototype and prepare materials. Every showcased live UI/payment outcome must be backed by a real run rather than fabricated footage.
