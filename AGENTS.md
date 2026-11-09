# ClearCart — Codex project instructions

These instructions apply **only** to the ClearCart repository. Do not read from, write to, or blend data and instructions with the owner's OMEGA, Mozilla bounty, or Google bounty projects.

## Immediate mission (PayPal AI Hackathon, deadline November 12, 2026, 12:00 p.m. Pacific)

Ship a truthful, reproducible, professional **cloud-created** functional demo video and prepare the complete Devpost submission. The owner does **not** need to appear on camera, supply their voice, or keep a personal computer running. Prefer producing the entire video from the Codex/cloud coding environment; never assume Codex has built-in GUI computer control, browser recording, speech synthesis, YouTube OAuth, or authenticated Devpost access. Probe capabilities and build using ordinary cloud-compatible tools where permitted.

**Read first:** README.md, docs/ELIGIBILITY.md, docs/VERIFICATION.md, docs/DEMO_SCRIPT.md, docs/SUBMISSION_DRAFT.md, and **docs/CLOUD_DEMO_RUNBOOK.md**. Follow current code and evidence, not claims in old drafts. Cross-check official rules at https://paypalaihackathon.devpost.com/rules when necessary.

## Execution priorities

1. Run baseline checks (npm ci, npm test, npm run build), inspect working app and document any failures.
2. Check whether cloud container supports headless Chromium/Playwright, page video or screencast capture, ffmpeg/ffprobe, and an accessible free/local text-to-speech engine. No paid APIs or unapproved service signup.
3. Implement repeatable cloud-first recording and editing scripts. Capture actual behavior of the current running ClearCart app, not mockups or synthetic screen imagery; use a clear 16:9 desktop viewport with readable UI and controlled test data.
4. Demonstrate task-to-plan, item reasons, budget adjustment, already-owned items, explicit buyer approval, and PayPal sandbox. Treat **actual PayPal capture as unverified until a genuine sandbox buyer approval and completed capture have been observed**. Mocked unit tests do not prove it; never fabricate success. If credentials or buyer interaction are unavailable, record what is genuinely verifiable, flag the payment segment as blocked, and prepare a video candidate without deceptive success claims.
5. Assemble an under-3-minute video, target 2:20–2:45, with original script, truthful captions and optional AI voiceover. No face, webcam, human narration, copyrighted music, or unlicensed assets required. Prefer clarity of functionality over effects.
6. Automatically validate the MP4 (duration, decode, resolution, sound/caption sync, no inadvertent secrets, truthful transitions); inspect representative frames and playback where possible. Preserve reproducible source scripts and a run log.
7. Update project documentation with evidence-backed status: executed commands, real vs mocked tests, final video location, unresolved limitations, public repository accessibility, and any YouTube/Devpost URLs. Keep uncompleted items marked pending.
8. If a secure authenticated YouTube upload/Devpost route is available and authorized, use it. Otherwise deliver a ready-to-upload MP4 and completed submission fields with minimal owner actions; **do not claim an upload, entry, or acceptance that did not occur**.

## Hard safeguards

- PayPal **sandbox only**; no production payments, paid purchases, payment capture with real funds, or unauthorized external operations.
- Never commit, echo, record, screen-capture, or publish client secrets, tokens, cookies, sandbox buyer credentials, or personal/private data. Use only legitimate secret injection or the app's temporary connection design; redact recordings and logs.
- Preserve existing code quality and security controls, explicit purchase approval, catalog-authoritative pricing, signed state, idempotency, and synthetic-catalog disclaimers.
- Do not weaken tests or fabricate verification to improve submission appearance.
- Do not require a user's local computer for production. Any remaining manual steps should be limited to account authentication, sandbox buyer approval when technically necessary, public upload, and final Devpost submission.
- Official rules require an openly licensed public code repository, complete setup directions or accessible demo, and a YouTube video under three minutes showing the functioning app. Public YouTube visibility is required.
- Do not assume posting an issue or committing this file independently starts a Codex Cloud run. When assigned this project, execute it and report concrete artifacts and blockers.

## Expected delivery

Produce a valid final video artifact if prerequisites permit, reusable source automation, machine-readable QA/provenance summary, updated submission materials, and a concise readiness report. State exactly which steps are complete and which need owner authorization/access. Optimize for a credible submission by the deadline; do not let cinematic polish displace end-to-end functional truth.
