# ClearCart — Cinematic Video & Design Direction (Nov 9, 2026)

**Purpose:** Provide a production-ready creative brief so Codex/Astra can automate the final film rather than spend cycles inventing the direction. **No video has been rendered by this document.**

## Brand system: "Precision with a pulse"

The existing live ClearCart website is intentionally warm, minimalist, cream-and-lime. **Preserve that real UI.** Use a contrasting dark studio frame around its genuine browser footage; do not re-skin the app deceptively.

| Token | Color | Use |
| --- | --- | --- |
| Nocturne | `#090F1F` | Opening/closing backgrounds, stage surround |
| Paper | `#F7F6EF` | Familiar product warmth, typography |
| Electric lime | `#D7F35C` | ClearCart accent; callouts and progress |
| Digital cyan | `#22D3EE` | Technical traces and subtle PayPal-stage accent, not a spoofed PayPal logo |
| Ink | `#252A26` | Website palette; contrast references |
| Cool gray | `#93A4B5` | Secondary copy and captions |

**Art direction:** restrained editorial sci-fi, kinetic type, subtle glowing lines, controlled spotlight, clean actual browser footage. Precise—not loud. No confetti, fake dashboards, false live shopping inventory, generative product screenshots, virtual presenters, stock footage, third-party brand artwork, or copyrighted music. Browser footage stays readable.

**Visual motifs:** a single input line of natural language transforms into three **illustrative editorial** labels — UNDERSTAND / FIT / APPROVE. Labels and vector lines are editorial graphics, not representations of unseen product state.

**Motion:** 30 fps or 60 fps source; target 1080p H.264 MP4 with yuv420p, AAC audio optional, captions. 250–450 ms transition windows; gentle 1.04x–1.14x crop zooms around real UI; no eye-strain strobe or strong parallax. Honor reduced motion during capture where appropriate. Avoid clipping line items.

**Sound:** synth voice only if available and natural; moderate warm voice, 125–145 spoken words/minute. Backed by quiet original/licensed ambient bed only if rights confirmed. Generate SRT from the final exact audio timing; do not export a music-only film as if narrated. Captions remain legible with sound off.

## 2:36 master film story (156 seconds; allow up to 2:49 for real sandbox approval)

This is an editing plan, **not a claim that specific checkout footage exists**. Re-time against actual recordings.

| Time | Shot / visual layer | On-screen line | Voiceover idea |
| --- | --- | --- | --- |
| 0:00–0:09 | Original vector motion: single bright input cursor on nocturne, resolves to ClearCart wordmark | `SHOPPING SHOULD START WITH YOU.` | "Shopping usually begins with a search. ClearCart starts with your goal." |
| 0:09–0:23 | Genuine desktop app opening; first-kitchen scenario is selected | `ONE NEED.` | "Say what you're preparing for, and set a spending limit." |
| 0:23–0:48 | Real browser: generate the actual plan; hold on items, reasons and total | `A PLAN YOU CAN EXPLAIN.` | "A small, trained classifier identifies the supported task. A budget optimizer finds useful combinations within the limit." |
| 0:48–1:10 | Real browser: hover/pan over cost, remaining limit, item-specific reasons | `EVERY DOLLAR ACCOUNTED FOR.` | "See why an item was chosen, what it costs, and how much remains." |
| 1:10–1:33 | Real browser: mark a relevant already-owned item and regenerate; lower budget, regenerate; capture distinct actual outcomes | `WHAT YOU OWN CHANGES WHAT YOU NEED.` | "Already have something? ClearCart accounts for it. Change the budget and the plan adapts." |
| 1:33–2:15 | Genuine PayPal sandbox session ONLY once authorized and fully verified. Show explicit buyer review and approval; do not reveal sandbox credentials or personal info | `YOU ALWAYS APPROVE.` | "Nothing purchases itself. The user approves a test checkout, then ClearCart verifies the payment result." |
| 2:15–2:31 | Actual success state if observed, otherwise do not represent as successful. Cut to minimalist architecture/guardrail explanation | `INTENT → PLAN → APPROVAL.` | "From a need to an understandable decision, with payment under human control." |
| 2:31–2:36 | Original closing motion with project name | `CLEARCART / YOUR NEED. YOUR LIMIT. YOUR CALL.` | "ClearCart. A more considered way to shop." |

**If checkout remains unverified:** Do not edit in a supposed completed PayPal result. Obtain the real test before the final submission; a planning-only film remains a candid interim draft. A submission based on a planning-only film may score poorly or fail stage one.

## Physical delivery assets

- `assets/demo/opening.svg`: original vector 16:9 opening, authorized to reuse in the video.
- `assets/demo/closing.svg`: original vector 16:9 ending.
- `assets/demo/thumbnail.svg`: original editorial title artwork for YouTube; export to 1280x720 PNG/JPEG before upload.
- `assets/demo/architecture.svg`: technical storyboard slide with accurate bounded classifier, optimizer and explicit PayPal approval; it currently labels real capture as unverified and **must be updated if used after real provider evidence is obtained**.
- `assets/demo/shotlist.json`: machine-readable 156-second storyboard with real-footage gates.
- `docs/YOUTUBE_PUBLISHING_PACK.md`: original video metadata and publication checklist.
- `docs/JUDGES_QUICKSTART.md`: judge-oriented installation and evaluation pathway. Never imply visualized dashboard/checkout is a real screenshot when it isn't.
- `docs/DEVPOST_OPTIMIZED_DRAFT.md`: judge-ready written submission with unverified gate explicitly labeled.
- `docs/CODEX_FINAL_HANDOFF.md`: concise final execution instructions.

## Production QA / objective gates

1. **Factual:** every statement supported by visible real app behavior or source code; separate editorial overlays from live app.
2. **Readable:** at 1280x720 player size, plan totals and approval text can be read on mobile; avoid tiny cursor/small-text rapid scrolling.
3. **Pacing:** a viewer understands problem within first 10 s, core differentiated result by 50 s, buyer control by 100 s.
4. **Trust:** no account secrets, no genuine username, test credentials, browser profile, cookies, or unsecured endpoints exposed. Label all checkout as **PayPal sandbox** and all prices **illustrative**.
5. **Accessibility:** accurate English subtitles, high contrast, no flashing transitions, respect copyright and IP requirements.
6. **Artifact:** ffprobe video/audio streams, duration <180.0s, 1920x1080 or 1280x720, H.264/yuv420p, SHA-256 and playback check.
7. **Distribution:** YouTube visibility **Public**, not Unlisted, and Devpost video URL embedded before deadline.

## Last-mile selection test

Before finalizing, ask two independent critical reviewers to watch with sound off: (a) can they explain product + actual AI + PayPal in 30 seconds? (b) can they distinguish prototype limitations from verified behavior? Resolve confusion before decorative polishing.
