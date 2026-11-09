# ClearCart demo recording plan

Target length: **2 minutes 20 seconds**. Record the actual final build in a desktop browser. Upload the finished video as **public** on YouTube, then add its URL to Devpost before the submission deadline.

Do not fabricate a successful payment or edit an error into a success. Complete and verify the sandbox flow before recording the checkout segment. Hide credentials, dashboard secrets, private account details, and unrelated browser tabs. Use original narration and no copyrighted background music.

| Time | Screen action | Suggested narration |
| --- | --- | --- |
| 0:00–0:15 | Open ClearCart with the need and budget controls visible. | “ClearCart turns an everyday task and a spending limit into an explained shopping plan. This prototype uses a small demo catalog.” |
| 0:15–0:40 | Enter a first-apartment cooking need and a budget supported by the final catalog. Generate the plan. | “I want to start cooking in my first apartment. The text classifier identifies the task, then the planner chooses useful items within my budget.” |
| 0:40–1:00 | Point to item reasons, total, and remaining budget. Mark an item already owned and regenerate. | “I can see why each item was included and how much remains. If I already own something, I can leave it out of the plan.” |
| 1:00–1:15 | Lower the budget and regenerate. Show the actual result. | “The spending limit is enforced in integer cents. When my budget cannot cover everything, the app shows the tradeoff.” |
| 1:15–1:50 | Review the cart. Start the genuine sandbox checkout, approve as the test buyer, and complete capture. | “I approve the purchase. The server calculates the amount from its catalog, creates a PayPal sandbox order, and waits for buyer approval. This is test money; no products are shipped.” |
| 1:50–2:05 | Show the genuine completed status, or the actual pending/error outcome. | If completed: “PayPal returned a completed capture. This is the sandbox transaction result.” Otherwise describe the result accurately and resolve it before claiming an end-to-end demo. |
| 2:05–2:20 | Return to the plan or a small architecture illustration. | “ClearCart runs its small trained model on a CPU. Codex helped develop the project. The goal is an understandable path from a practical need to a purchase the person controls.” |

## Before recording

- Verify the exact example against the current catalog; do not promise a particular item list or amount that the build does not produce.
- Confirm model, budget, and payment tests passed and record their actual results in the README.
- Complete one genuine sandbox transaction and check it in the sandbox account.
- Ensure the complete app and source are accessible to judges through the documented route.
- Use only footage and assets that the entrant owns or has permission to publish.

If sandbox credentials are still missing, a planning-only walkthrough can be an internal progress video. It is not the finished contest demo and must not be presented as verified PayPal checkout.
