# Mac mini pipelines → dual-publish to collegegps01 (publisher-side setup)

Per the brief (§5, pipeline feeds): the mini's scholarship DB and EC_finder
pipelines currently publish to **collegeapp01**'s Firestore. During the
transition they should publish to **both** projects. This doc lists only the
config the publisher side needs — the mini scripts themselves are the owner's
to change.

## 1. Create a service-account key for collegegps01 (one time)

Signed in as **gil4him@gmail.com**:

1. Open https://console.firebase.google.com/project/collegegps01/settings/serviceaccounts/adminsdk
2. Click **Generate new private key** → a JSON file downloads.
3. Move it onto the mini, e.g.:
   `~/keys/collegegps01-service-account.json`
4. `chmod 600 ~/keys/collegegps01-service-account.json` — this key has full
   database access; never commit it, never email it.

## 2. Env on the mini

The publish scripts already authenticate to collegeapp01 (existing
`GOOGLE_APPLICATION_CREDENTIALS` or equivalent). Add a second variable for
the new project, e.g. in the pipeline's env file:

```
COLLEGEGPS01_SERVICE_ACCOUNT=/Users/<mini-user>/keys/collegegps01-service-account.json
COLLEGEGPS01_PROJECT_ID=collegegps01
```

## 3. What "dual-publish" means for the scripts

Whatever the current publish step writes to collegeapp01, write the same
payload to collegegps01 with a second Admin-SDK app instance:

```js
// second app instance alongside the existing one
const gps = admin.initializeApp({
  credential: admin.credential.cert(process.env.COLLEGEGPS01_SERVICE_ACCOUNT),
  projectId: process.env.COLLEGEGPS01_PROJECT_ID,
}, "collegegps01");
const gpsDb = gps.firestore();
// ...same .set()/.batch() calls, same collection names, against gpsDb
```

Keep the **same collection names and doc shapes** — collegegps01's reader
(the alerts/matches surface, later slice) will be built against whatever the
mini already publishes (`scholarships/…`, EC/activity docs). No renaming
needed.

## 4. Security-rules note (collegegps01 side — already handled)

The service account bypasses Firestore security rules, so nothing needs to
be opened up in `firestore.rules` for the pipelines to write. Client apps
still can't touch those collections until read rules are added in the slice
that consumes them.

## 5. Rollback / stop

Dual-publish is additive: to stop, remove the second write block. Deleting
the key in the Firebase console (Settings → Service accounts → Manage all →
delete key) revokes the mini's access instantly.
