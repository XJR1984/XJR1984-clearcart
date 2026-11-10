# ClearCart Release Candidate Status — November 9 Pacific / November 10 UTC

**Status: SUBMISSION MATERIALS PREPARED — NOT SUBMITTED.**
PayPal AI Hackathon deadline: **November 12, 2026 at noon Pacific**.

## Independently executed in GitHub Actions

The cloud CI release at https://github.com/XJR1984/XJR1984-clearcart/actions/runs/42760840643 completed **all** steps successfully: `npm ci`, `npm test`, `npm run build`, Playwright/Chromium capture, FFmpeg rendering, decode test and artifact upload. The source repository is public and MIT licensed. No Codex, personal computer, human narration or webcam was necessary.

The release artifact contains:
- `ClearCart-Working-Demo-Candidate.mp4`, **66.000 seconds**, **1920 × 1080**, H.264;
- original opening, closing and architecture graphic assets;
- five **real Chromium application screenshots** and the source browser recording;
- `editorial-captions.srt`, independent browser audit and video release report;
- SHA-256 of MP4: `80a3a67b9dfd4ba83c9ad60325ccb6ba3699d067108777fc9f4bf1cea1fb9a46`.

**Real observed application results** (no payment credentials in runner):
- First-kitchen scenario, $75 budget: $44.94 basket;
- already-owned $14.99 frying pan excluded: $29.95 basket;
- budget reduced to $45: $29.95 basket remains within the limit;
- unconfigured PayPal setup shown honestly, with no payment claimed;
- browser console/page errors: none reported.

## Release gates still open

1. Genuine PayPal **sandbox** developer credentials need owner-authorized secure setup, not chat-visible secrets. Perform actual OAuth, sandbox buyer approval, completed capture, amount/status verification and evidence with redaction.
2. Record authentic PayPal provider/checkout footage if included in the final competition video. The current film demonstrates the planning UI **only** and is not evidence that the PayPal flow succeeded.
3. Upload the final demo video to **public YouTube**, confirm logged-out playback, and add that URL to Devpost.
4. Complete the user's authenticated Devpost entry, confirm eligibility/rules, and retain the submitted entry URL and confirmation.
5. Check judge access to the app via public reproducible source/run instructions, or genuinely public hosted demo; existing owner-private hosted preview is not publicly accessible by default.

**Important:** GitHub Actions artifacts are not substitutes for the required public YouTube URL; the 66-second video is a truthful working-prototype candidate and should be superseded by real payment footage where feasible.

## Source and creative handoff

- [Source README](../README.md)
- [Cloud video production](CLOUD_DEMO_RUNBOOK.md)
- [Judge quickstart](JUDGES_QUICKSTART.md)
- [Competition strategy](COMPETITION_STRATEGY.md)
- [Devpost draft](DEVPOST_OPTIMIZED_DRAFT.md)
- [Final Codex / Astra handoff if needed](CODEX_FINAL_HANDOFF.md)

Do not ask TinyFish to repair GitHub privacy; the owner already made it public and the GitHub API independently confirmed `visibility: public`.
