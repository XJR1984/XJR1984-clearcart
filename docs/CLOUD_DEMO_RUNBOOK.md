# ClearCart Cloud-Only Hackathon Video & Submission Runbook

**Status:** Implementation directive, not proof that a video was rendered or the contest was entered. **Scope:** this repository only. **Deadline:** Thursday, November 12, 2026, 12:00 p.m. Pacific.

## Owner requirements and success criteria

- Create the complete ClearCart demonstration **in the cloud**, without using the owner's personal computer.
- No webcam appearance, recorded human voice, or personal narration needed. AI/local TTS voiceover and/or readable captions are acceptable production options; check permissions and competition terms.
- Video must show the **actual functioning app** on its intended device, run **under 3:00**, and be hosted on YouTube with public visibility for Devpost.
- Codex should automate browser capture, timed scripted interactions, editing, captions, audio, rendering, QA, and drafting submission materials wherever environment permissions allow.
- Uploading to the owner's channel requires valid authorized YouTube account access; completing Devpost requires authenticated submission. Do not presume access; leave exact minimal owner action if unavailable.
- **Highest priority:** verifiable function, central PayPal + AI integration, readable UX, and honest evidence. Do not substitute generated UI video or edited-in payment successes.

## Reality check from repository evidence (November 9, 2026)

Existing demo script: docs/DEMO_SCRIPT.md. Existing description: docs/SUBMISSION_DRAFT.md. Existing checklist: docs/ELIGIBILITY.md. Prior verification: docs/VERIFICATION.md.

- The planning model is a small Naive Bayes classifier trained on synthetic examples, plus exact budget-constrained enumeration over synthetic products. Describe this precisely; do not claim it is a production-grade LLM shopping agent.
- The PayPal sandbox integration is implemented and tested with simulated provider responses, but the prior verification record does **not** prove a genuine PayPal sandbox order approval or completed capture.
- The existing hosted preview is owner-private, so do not promise a judge can access it anonymously. The public repository plus complete run instructions is a permitted alternative under the hackathon's functional demo requirements.
- The GitHub repository was returned as **public** by the connected GitHub integration on Nov 9, 2026. Reconfirm public access anonymously and reconcile any outdated references to repository privacy elsewhere in docs.

## Cloud preflight — do, don't assume

1. In Codex's actual working copy, inspect branch, uncommitted changes, README, package.json, and relevant docs.
2. Run `node --version`, `npm ci`, `npm test`, and `npm run build`. Record exit codes and date.
3. Check: Chromium availability, Playwright installability, executable/browser download constraints, headless screenshot/video capture, ffmpeg and ffprobe. Standard Playwright browser video or CDP screencast techniques are options; Codex's **built-in** browser/GUI control is not presumed.
4. Check availability of local/free TTS; if unavailable, deliver caption-forward video with clear original titles and no paid API dependence. Silence is better than broken, misrepresentative narration.
5. Check whether the environment can run a local Node server accessible to the headless browser. Keep credentials outside source control and video.
6. Record a capability matrix: available, tested, blocked, cost, workaround, and proof artifact.

## Recording plan (use real observed behavior)

Suggested 2:20–2:45 timeline, modifiable after measuring the actual workflow:

| Approx. time | Real on-screen action | Message |
| --- | --- | --- |
| 0:00–0:12 | ClearCart's actual application | Task and budget become an explained shopping plan; synthetic catalog |
| 0:12–0:42 | Enter a supported need and a budget, generate plan | Show the AI classifier's task recognition and budget optimization honestly |
| 0:42–1:08 | Item reasons, actual cost and remaining budget | Explain user control and price transparency |
| 1:08–1:30 | Mark an owned item, regenerate; adjust budget | Demonstrate actual changed outputs, not hard-coded screenshots |
| 1:30–2:16 | Review and initiate PayPal sandbox flow; require approval; show the **actual** provider outcome | Show completed payment only after a genuine sandbox buyer approval, capture and status/amount verification |
| 2:16–2:40 | Actual final result, concise architecture/summary or limitations | Explain meaningful PayPal+AI use, controls, and what this prototype does not do |

Replace timings with measured recordings. If genuine sandbox credentials or buyer approval remain unavailable, **do not** claim a fully verified payment flow. Create an honest planning-demo draft and clearly report the verification blocker; do not quietly replace the missing payment footage with a staged result. The final submission should show substantial genuine PayPal interaction.

## Implementation approach

- Prefer automated scripts in `scripts/demo/` or an equivalent documented path. A browser tool can launch `npm run dev` as a child process, wait for a health route, run deterministic interactions, and save a real browser recording. Verify actual selectors and stable demo inputs from the code first; do not invent cart prices or outcomes.
- Use a consistent 1920x1080 or 1280x720 landscape viewport, standard frame rate, legible font size, visible pointer/focus treatment, deliberate pauses at key states, and correct page/audio timing.
- Concatenate and normalize real screen capture segments with FFmpeg; title cards and subtle highlights may be original artwork. Never create false functional displays or obscure true errors.
- Produce `clearcart-demo-final.mp4` plus plain text transcript, captions (.srt/.vtt), and automation source. Store artifacts in Codex-accessible output location and provide an actual artifact link; do not assume a GitHub URL or local filesystem artifact is downloadable by the owner unless verified.
- Do not check potentially large MP4 binaries or recorded secrets into the repo by default. If uploads are needed, use a suitable authorized destination and document it.
- For YouTube upload, use an authenticated, approved integration or OAuth-based upload tool only after permissions are available. Public visibility must be confirmed at the final URL. Never commit OAuth tokens or authentication cookies. If access is unavailable, give owner exact upload steps.
- For Devpost, use the existing prepared English submission draft, verify truthful claims and public URLs, and submit only with authorized authenticated access. Otherwise return final draft and explicit handoff.

## Automated quality and safety gates

**Technical:** baseline npm checks pass; no unexplained build errors; MP4 and audio decode without errors; video duration strictly below 180 seconds; landscape video playable at 720p or better; text and key UI legible in sampled frames; audio and captions aligned, if present.

**Integrity:** no simulated payment described as real; a genuine sandbox payment shown only after observed authorization and capture confirmation; no real-money payment; no hidden/unapproved checkout; no secrets, cookies, account credentials, unrelated tabs, or personal data in frames, captions, outputs, logs, or committed files; truthful synthetic catalog and AI capabilities.

**Submission:** repo anonymous/public and open source; functional build accessible via complete reproducible run instructions or publicly usable demo; correct PayPal and AI disclosures; YouTube URL confirmed publicly visible; English Devpost fields populated; submission confirmation and URL captured if submitted. Missing items remain OPEN.

## Evidence / blockers report

Maintain or update `docs/VERIFICATION.md` or a dated report containing:
- command, environment, commit, execution timestamp, exit result;
- browser/video capture tool availability and a sample proof recording;
- real PayPal sandbox outcome, timestamp and non-sensitive proof (or BLOCKED);
- video file SHA-256, ffprobe summary, runtime, caption/transcript location;
- whether YouTube upload succeeded, exact public URL, and actual public visibility test;
- whether Devpost submission succeeded, exact entry URL and confirmation;
- unresolved dependencies with the **smallest owner action** needed.

## No-local-computer contingency

If Codex Cloud cannot access a browser recording stack, try permitted cloud-container browser binaries/packages or another authorized cloud execution environment; do **not** automatically move work onto the owner's computer. If browser, TTS, or encoding remains blocked, deliver reproducible scripts, evidence, and a clearly labeled blocked step rather than claiming the video exists.

Official links:
- https://paypalaihackathon.devpost.com/rules
- https://paypalaihackathon.devpost.com/
- https://developer.paypal.com/
