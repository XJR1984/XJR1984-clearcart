# ClearCart — 5-minute judge quickstart

This page is a **runnable evaluation guide**, not a replacement for the complete [README](../README.md) or evidence [verification report](VERIFICATION.md). Updated November 9, 2026.

## What to expect in 30 seconds

ClearCart takes a single supported everyday need, a budget, and items the user already owns. A small trained intent classifier chooses among four categories, and an exact integer-cent planner returns an explained synthetic-product cart that respects the spending limit. Users must explicitly approve **sandbox** checkout; no production payments or goods.

**Scope:** first kitchen, study desk, basic tool kit, portable lighting. Unsupported requests are declined. It does not search live retailers, ship items, price tax or fees, or promise savings.

## Start the working application

Required: **Node.js 22+** and npm. Public source: https://github.com/XJR1984/XJR1984-clearcart

```bash
git clone https://github.com/XJR1984/XJR1984-clearcart.git
cd XJR1984-clearcart
npm ci
npm test
npm run build
npm run dev
```

Open **http://127.0.0.1:3000/** in a browser. This runs the planning app without any paid API, GPU, or PayPal credentials. If something fails, preserve the command output and check `docs/VERIFICATION.md`; do not disable tests.

## Exercise the explainable AI plan

1. Choose **First kitchen** in the preset scenarios and select **Make my plan**. Observe the **actual** item list, reasons, total, unspent budget and uncovered needs; synthetic prices only.
2. Expand **Already have a few things?** and select an item actually present in the current cart, then regenerate. See which needs are already covered.
3. Lower the budget and generate again. Compare the actual changed plan, total and remaining budget. The planner enforces the entered cap in integer cents.
4. Try an unsupported request. The model should decline rather than make up a cart. Note: classification scores are not calibrated probabilities.

## Exercise PayPal sandbox checkout (optional separate setup)

The checkout uses PayPal Orders v2 **sandbox only**. To test an actual capture, create your **own** free PayPal Developer sandbox credentials and a personal sandbox buyer under https://developer.paypal.com/dashboard/; use the app's `Connect PayPal sandbox` form to supply sandbox **client ID** and **client secret** privately, or use an untracked local `.env` following `.env.example`. Never commit credentials or show them in public feedback/screenshots. Do **not** use real PayPal account credentials or funds.

Create/review a plan, choose **Continue to PayPal sandbox**, personally approve as the sandbox buyer, and choose **Complete sandbox payment** after returning. Verify the completed capture with the PayPal sandbox dashboard. A genuine completed provider-side capture was **not yet verified** in the repo's November 9 record; simulated test results are not live proof.

## Why PayPal and AI are both central

- AI routes a task to one of four supported needs; this is a deliberately bounded classifier, not a language-model chat agent.
- An optimization step selects a constrained cart while preserving explainability and budget limits.
- PayPal sandbox supplies the genuine human-approved checkout surface and provider-verifiable order status.
- Signed expiring state, server-side prices, stable request IDs and amount/status verification aim to reduce inconsistencies and false success claims.

## Evidence and architecture

- [What is verified and unverified](VERIFICATION.md)
- [Source code and full setup](../README.md)
- [Original visual architecture](../assets/demo/architecture.svg)
- [Competition position and product limitations](COMPETITION_STRATEGY.md)

The repo is **public** per the owner's Nov 9 change and the connected GitHub API; no more privacy repair is necessary. The original hosted Sites preview may still be owner-private and should not be offered as judge-accessible unless verified.
