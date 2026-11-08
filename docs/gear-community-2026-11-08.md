# Gear discovery and community intake

This update adds `/join`, a short sponsorship landing page linked consistently from the game. The existing sponsor application endpoint receives the same required company, contact name and email. Other application fields remain optional. The new compact form records source/medium/campaign with consented start/submission events, without sending personal form fields to analytics. The original full application page remains available.

`POST /api/gear-suggestions` accepts an explicit player request (gear category, 10–1,000-character idea, optional reply email, request UUID, game version and platform). Bodies are streamed with an 8 KB ceiling. It accepts native requests without an Origin, and browser requests only from the SnowThumb domains. A successful response is returned only after private storage confirms receipt. API errors never echo request content or configuration.

The existing Vercel server credential provisions a single fixed `player-requests` Storage bucket if absent: private, JSON only, 8 KB object limit. No server credential is copied into the game, browser or repository. Public bucket configurations fail closed. No anonymous/authenticated Storage policies are added. `/admin/suggestions` explicitly checks admin authorization before privileged reads and provides pages of 40 requests. Editor submissions are kept separately from player ideas.

Canonical UUID filenames with overwrite disabled make retries idempotent across days. Five fixed, atomic reservation objects enforce a per-address/day limit, including concurrent requests and retries. Only a daily HMAC is kept for rate limiting; raw addresses are not saved. Testing and player limits are separate. Suggestion contents and optional emails never enter analytics, and no email or external notification is sent automatically. The privacy page describes this explicit submission and reply-only use.

Verification: seven Node tests cover request fields, optional email, streamed size limits, malformed JSON, quota exhaustion, concurrent distinct requests, duplicate retries and reservation reuse. ESLint and the production TypeScript/webpack build pass. Local Turbopack could not start its CSS worker; the supported webpack build was used for validation. The pre-existing dependency lock mismatch was repaired; the existing gear customizer now derives its initial logo without an effect-triggered state update, fixing the lint failure encountered during validation.

Local browser checks: the new landing page renders, its compact form has three required fields plus optional message, and empty submission identifies the missing fields without sending a request. Local layout testing uses ignored stub environment configuration that disables real application submission. Production uses the existing Vercel configuration. No fake sponsor lead was submitted and no notification webhook was triggered for testing.

Deployment and live receipt/authorization checks are recorded after publishing. The separate Unity release includes the actual gear prompt and player-facing request form.

## Production verification — November 8, 2026

Implementation commit c8e763d67115e2f522e05dac3a73220e919a55d8 was pushed to main. Vercel deployment dpl_55E7TjeXdN77Qt5rnWSk8DxDanrf reached READY for production at sponsors.snowthumb.com. The published /join page returned HTTP 200 and was visually checked with the real Croes Ave board example and short inquiry form.

The game Editor submitted a clearly labeled, reply-email-free QA idea (request efcc8c4d-850c-41e4-af36-da885abd6790, OSXEditor) through the production API and displayed its matching success receipt. Repeating the same request returned HTTP 200 with the same receipt. It is segregated under testing/, outside the player inbox. No notification was sent.

The private object's public URL returned a denial without revealing the idea. Signed-out /admin/suggestions returned HTTP 307 to /login?next=%2Fadmin%2Fsuggestions. Administrator contents were not opened with a signed-in admin account during this test; the handler checks authorization before making privileged reads. Production configuration stayed on Vercel; no server credential was retrieved or copied.

Previous production deployment dpl_74aehPfzz8qFVPwpfvL6XfRdGG5e remains the rollback reference. The new endpoint can be disabled by reverting its route if needed; existing sponsor application behavior remains on its prior endpoint.
