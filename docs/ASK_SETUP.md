# Ask consultant — one-time setup (owner steps)

The Ask bubble's backend is a Cloud Function calling Claude. Two things need
the owner (gil4him@gmail.com) once; everything else is deployed by CLI.

## 1. Enable Blaze billing on collegegps01

Open https://console.firebase.google.com/project/collegegps01/usage/details →
**Modify plan** → Blaze (pay as you go) → attach a billing account.
Cloud Functions and Secret Manager require it. Expected cost: pennies —
Functions free tier covers this usage; the Claude API call is roughly
$0.01–0.05 per question (Sonnet 5, with prompt caching).

## 2. Store the Anthropic API key as a secret

From the repo directory (the CLI is already logged in as gil4him):

```
firebase functions:secrets:set ANTHROPIC_API_KEY
```

Paste your Anthropic API key (the same one collegeapp01 uses, from
console.anthropic.com) when prompted. The key lives in Google Secret
Manager; the function reads it at runtime; it never ships to the browser.

## 3. Deploy

```
firebase deploy --only functions
```

(Claude runs this too — steps 1–2 are the only owner-only parts.)

## Caps and cost control

- Daily fuse: 20 questions/user/day (free tier), enforced always.
- Monthly counter: counted on `households/{hid}/usage/{yyyy-mm}` (10/mo
  free-tier limit exists in entitlements but is NOT enforced yet — soft
  launch, same as collegeapp01).
- `maxInstances: 5` on the function bounds runaway cost.

## What the consultant writes

- `households/{hid}/ask_chats/{uid}/messages` — the private thread
- `households/{hid}/memos` — facts learned (feeds future answers)
- `todos` — the consultant's checklist (parents check items off)
- Whitelisted band patches to `children/{id}` and `profiles/{hid}` —
  the road then regenerates automatically in the app
