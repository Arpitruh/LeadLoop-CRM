# Sister's Magical Spoon → LeadLoop (Phase 4)

**Status:** Receiver implemented in LeadLoop. You still need to update Sister's Magical Spoon's server route and deploy both services to activate it. No credentials have been configured.

The source site's **server** must POST to `<LEADLOOP_CRM_URL>/api/v1/integrations/sisters-magical-spoon` with the exact raw JSON body it signs.

- `x-leadloop-timestamp`: Unix timestamp in seconds (UTC, accepted within ±5 minutes)
- `x-leadloop-signature`: `sha256=<hex HMAC-SHA256>` of `${timestamp}.${rawJSONBody}` using the shared secret
- `Content-Type: application/json`

CRM server environment:

- `SISTERS_BUSINESS_ID` = the target Business.id from the CRM
- `SISTERS_CRM_SECRET` = a random 32+ character secret, identical to the source site's `LEADLOOP_SISTERS_SECRET`

Source server environment:

- `LEADLOOP_CRM_URL` = public HTTPS URL of the CRM
- `LEADLOOP_SISTERS_SECRET` = the same secret (never `NEXT_PUBLIC_*`)

The JSON must include `{ "externalSubmissionId":"unique-and-stable-id", "name":"Person", "phone":"+919876543210", "pincode":"201301", "consent":true }`. Optional fields: `email`, `plan`, `meals` (integer), `deliveryPreference`, `message`.

**Reliability requirement:** On the source site, store the submitted enquiry and `externalSubmissionId` durably BEFORE forwarding it to LeadLoop. If forwarding fails, mark it pending and retry later **using the same ID**. LeadLoop uses a database uniqueness constraint to make accepted retries idempotent, but cannot prevent loss if the source discards a failed submission. No integration logs or delivery dashboard are included in this MVP.

An example server forwarding function is at `examples/sisters-server-handler.ts`. It must be adapted to the website's actual existing form-handler design. It is not automatically connected.
