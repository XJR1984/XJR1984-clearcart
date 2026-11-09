# PayPal AI Hackathon entry checklist

Verified against the [official rules](https://paypalaihackathon.devpost.com/rules) and [contest page](https://paypalaihackathon.devpost.com/) on **November 8, 2026**. This file records requirements; it does not establish the entrant's eligibility or a submitted entry.

## Timing and reward

- Submit by **Thursday, November 12, 2026, 12:00 noon Pacific** (Washington state local time; 20:00 UTC).
- Judging runs December 1–15, 2026. Keep the submitted application available through the end of judging.
- Winners are expected around December 21, 2026.
- Main cash prizes are $12,000, $8,000, and $5,000. Five honorable-mention categories award $5,000 each. Sponsor-specific prizes have additional tool requirements; Render prizes are credits, not cash.
- Entry and the PayPal sandbox are free. This is a judged contest, not payment for completing the app. No award or earnings have been secured.

## Entrant checks — user must verify

- [ ] At least the age of majority where you reside at entry.
- [ ] Residence is eligible. Washington state is not listed as an excluded jurisdiction; this alone does not establish personal eligibility.
- [ ] No disqualifying employment, household, judging, organizer, or other conflict described in section 3 of the rules.
- [ ] Rights to submit the project and use its included code, assets, and tools.
- [ ] Read and accept the official rules before entering. Submission creates an agreement with PayPal and Devpost.

## Project and submission checks

- [ ] Join the contest with a free Devpost account.
- [ ] Integrate PayPal's developer platform using its free sandbox, centrally to the project.
- [ ] Meaningfully incorporate an AI tool, model, or platform into the product. Codex's help writing code should be disclosed separately from ClearCart's runtime classifier.
- [ ] Complete and personally inspect a genuine sandbox buyer approval and capture. A mocked test response is not proof of this integration.
- [ ] Provide all source and complete setup instructions in a **public** GitHub, GitLab, or Bitbucket repository with a detectable open-source license.
- [ ] Give judges a functional build: complete run instructions or an accessible hosted demo. A private owner-only Site link alone is insufficient.
- [ ] Upload a publicly visible YouTube video under three minutes showing the real application functioning.
- [ ] Finish the English description, tool disclosure, repository URL, and video URL in Devpost; submit before the deadline and retain its confirmation.

Rules allow any AI tool and permit technical assistance subject to originality and ownership requirements. They do not guarantee eligibility merely because AI-assisted code passes tests. Describe the entrant's contribution and AI assistance accurately.

## Free account setup

1. Open [the hackathon](https://paypalaihackathon.devpost.com/), select **Join Hackathon**, and sign up or sign in to Devpost. Review the rules before agreeing.
2. Open [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) and sign up or sign in. Keep the dashboard in **Sandbox** mode.
3. Open **Apps & Credentials**. Select **Create App** and name it `ClearCart Sandbox`, or use the provided default sandbox app. Its client ID identifies the app; its client secret authorizes server requests.
4. Open [ClearCart](https://clearcart-budget-lab.esteemeddeer4.chatgpt.site) and expand **Connect PayPal sandbox**. Paste the sandbox client ID and secret into that app's form, then select **Connect sandbox for this browser**. The app exchanges the secret for a temporary access token and discards the secret; the token stays in an HttpOnly browser cookie for at most one hour. **Do not paste credentials into chat, a public repository, a screenshot, or the demo video.** This project needs sandbox app credentials only, not your real PayPal account password. Local developers may instead use an untracked `.env` file.
5. Under **Testing Tools → Sandbox Accounts**, locate the personal buyer account and business seller account. **View/Edit Account** shows their mock login details. Use the personal sandbox buyer to approve the test payment; keep those login details private too.
6. Follow the README to start the app, create a small test cart, approve the order on PayPal's sandbox, and complete capture. Confirm the sandbox transaction appears in the sandbox account. Record the outcome without credentials.

PayPal's [official setup guide](https://developer.paypal.com/api/rest/) explains these dashboard steps. Do not use real money or switch this prototype to production payments for the contest.

## Current handoff status

The user confirmed creation of the PayPal Developer account, Devpost account, and GitHub repository, and confirmed entrant eligibility on November 9, 2026. The source is uploaded to [XJR1984/XJR1984-clearcart](https://github.com/XJR1984/XJR1984-clearcart). It remains private because the GitHub integration rejected changing visibility (HTTP 403). Joining the contest, public source visibility, public video upload, genuine PayPal sandbox verification, and final Devpost submission remain pending. Use the README's latest verification record for executed tests and deployment status.
