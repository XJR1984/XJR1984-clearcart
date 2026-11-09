# ClearCart — Devpost submission draft

**Not submitted.** The text below describes the implemented prototype and its verified limits. The user confirmed entrant eligibility on November 9, 2026 and authorized final submission. A genuine PayPal sandbox transaction, public source visibility, and a public YouTube demo must still be completed before treating the entry as ready. Do not replace pending evidence with simulated results.

## Project fields

- **Project name:** ClearCart
- **Tagline:** Turn an everyday need and a fixed budget into an explained cart you approve before checkout.
- **Repository:** https://github.com/XJR1984/XJR1984-clearcart
- **Run instructions:** https://github.com/XJR1984/XJR1984-clearcart/blob/main/README.md
- **YouTube demo:** **Pending — insert the verified public URL for a video under three minutes.**
- **Hosted preview:** https://clearcart-budget-lab.esteemeddeer4.chatgpt.site — currently owner-private; it is not a judge-accessible demo by default. The repository's complete local run instructions are the alternative access path.
- **Built with:** JavaScript, multinomial Naive Bayes, exact enumeration, PayPal Orders v2, Node.js, Cloudflare Workers via Sites, esbuild, ChatGPT/Codex.

## Inspiration

Someone setting up a first kitchen or study space often starts with a task and a spending limit, rather than a list of product names. ClearCart explores how an assistant can turn that starting point into a small, understandable shopping plan while keeping the final purchase under the person's control.

## What it does

Describe one supported task, enter a budget, and mark items you already own. ClearCart identifies the task, chooses items from a 32-product demonstration catalog, explains each choice, and shows the total, remaining budget, and needs the budget could not cover.

The four supported categories are a starter cooking kitchen, study desk, basic hand-tool kit, and portable lighting. Weak or unsupported requests are declined. The current model also declines exclusions and negation rather than attempting to interpret them unreliably; the owned-item checklist handles items already available.

After reviewing the plan, the person can connect their own PayPal sandbox application and start checkout. The checkout implementation recalculates prices on the server, creates a PayPal Orders v2 order, requires buyer approval, and verifies the capture status and amount before displaying success. All products and prices are synthetic. Sandbox transactions use test funds, and no products are shipped.

**Current verification limit:** the complete payment flow has passed tests with simulated PayPal responses. A genuine sandbox buyer approval and capture is still pending and must be recorded separately.

## How it is built

A CPU-only multinomial Naive Bayes classifier learns from 48 original AI-assisted synthetic phrases. It selects a supported task category; it does not generate product claims or prices. An exact enumeration then maximizes predefined need coverage within the budget, with lower cost breaking ties. Arithmetic uses integer cents, and owned items remove already-covered needs from the search.

PayPal connects the explained plan to an explicitly approved test purchase. The browser connection form sends sandbox application credentials directly to the server for an OAuth exchange. The server discards the client secret and places the access token in an HttpOnly cookie for at most one hour. Hosted cookies use Secure and SameSite=Lax. Checkout state is bound to the current connection, and repeated requests use stable PayPal request IDs. Disconnecting clears the cookie; it does not revoke the provider token or cancel existing orders.

The same JavaScript request handler runs locally on Node.js and as a hosted Worker. No GPU or paid language-model API is required.

## Challenges addressed

The implementation handles changes to the need or budget while a plan or checkout request is still loading, so an older cart cannot silently become current again. Connection handling also distinguishes successful authentication from a browser that failed to retain the connection cookie, and reveals reconnection controls when a temporary connection expires.

## What was verified

The current implementation passed **52 automated test cases**, covering planning, exact budget limits, catalog-authoritative prices, payment response checks, repeated requests, session isolation, expiration, and frontend event behavior. Payment-provider responses in those tests were simulated.

Separate checks against the deployed app confirmed planning, configuration, page delivery, and connection-cookie headers. Real-browser visual and accessibility checks remain pending. The four held-out classification examples are functional checks, not an accuracy benchmark. These results do not constitute a production audit or proof of a real PayPal transaction.

## Limitations and next steps

The catalog and training data are small and synthetic. ClearCart does not search retailer inventory, compare actual market prices, understand detailed product preferences, calculate real tax or shipping, or provide fulfillment. The portable-lighting example is a shopping demonstration, not an emergency-preparedness plan.

Next steps are to verify the genuine sandbox flow, test the interface with people planning real purchases, improve evaluation on user-written requests, and explore authorized merchant data. The project does not claim that shopping assistants or intent classifiers are new inventions.

## AI assistance disclosure

ChatGPT/Codex assisted with research, implementation, tests, training examples, and documentation. The runtime AI component is the included Naive Bayes classifier. The entrant should accurately describe their own participation; this draft does not represent the work as unaided or claim a user study that did not occur.

## Final verification checklist — keep separate from the project description

- [x] Upload the MIT license, complete source, tests, and run instructions to the user's specified repository. Source upload succeeded on November 9, 2026.
- [ ] Make the repository publicly accessible. The GitHub integration rejected the visibility change with HTTP 403; signed-in owner access is needed. A hosted demo does not replace the public-source requirement.
- [ ] Complete a genuine sandbox connection, buyer approval, capture, and transaction confirmation. Record the date and outcome without secrets.
- [ ] Inspect the final build in a real browser and correct any observed problems.
- [ ] Publish an actual-functionality video under three minutes on YouTube and insert its public URL above. Do not show credentials or substitute a simulated payment for a real sandbox result.
- [x] Obtain the entrant's confirmation of eligibility against the [official rules](https://paypalaihackathon.devpost.com/rules). The user confirmed “I meet the eligibility requirements” on November 9, 2026; this records their statement, not independent identity verification.
- [ ] Join the contest, complete the English submission fields, and select only prize categories whose requirements the project actually meets.
- [ ] Submit before **November 12, 2026 at noon Pacific (20:00 UTC)** and retain the confirmation and entry URL. Keep the submitted build available through judging.

**Evidence fields still to fill:** genuine sandbox test date/result; public video URL; final entry URL and submission confirmation. No entry acceptance or award has been secured.
