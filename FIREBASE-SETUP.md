# Turning on live sync (Firebase, free plan)

The app works without any of this (QR codes only). Do these steps once to let helpers' splits reach the organizer automatically.

## 1. Create the project
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. **Create a project** (any name, e.g. `xc-splits`). You can turn Google Analytics off. Stay on the free **Spark** plan; no payment method is needed.

## 2. Create the database
1. In the left menu: **Build → Realtime Database → Create Database**.
2. Pick the location closest to you and choose **Start in locked mode**.
3. Open the **Rules** tab, replace everything with the rules below, and **Publish**.

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "races": {
      "$rid": {
        ".read": "$rid.length <= 12",
        ".write": "$rid.length <= 12",
        "h": {
          ".read": "$rid.length <= 12",
          "$hid": {
            ".write": "$rid.length <= 12 && $hid.length <= 16",
            ".validate": "newData.hasChildren() || !newData.exists()"
          }
        }
      }
    },
    "codes": {
      "$code": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['maxUses', 'used']) && newData.child('maxUses').isNumber() && newData.child('used').isNumber() && newData.child('used').val() >= 0 && newData.child('used').val() <= newData.child('maxUses').val()"
      }
    }
  }
}
```

What these rules do: nobody can list races; you can only read or write a race if you know its random race code. Helpers write under `h`. The organizer can delete a race when finished. **Unlock codes** live under `codes/{CODE}` (readable so devices can redeem; each redeem bumps `used`).

### Unlock codes (you create these)

In **Realtime Database → Data**, add a child under `codes` (name = the code users type, **UPPERCASE**, e.g. `MEET-SAT-01`):

| Field | Example | Meaning |
|--------|---------|--------|
| `maxUses` | `5` | How many phones may redeem this code |
| `used` | `0` | Start at 0; the app increments on each redeem |
| `host` | `true` | Unlocks Invite helpers / Import for a limited time |
| `live` | `true` or `false` | Whether this code also unlocks Live sync |
| `hours` | `24` | How long the unlock lasts on that phone |

Example: one Saturday code for 12 coaches, helpers + live, 24 hours:

```
codes/
  MEET-SAT-01/
    maxUses: 12
    used: 0
    host: true
    live: true
    hours: 24
```

Host-only (no live): set `live: false`. When `used` reaches `maxUses`, further redeems fail.

## 3. Get the config
1. **Project settings (gear icon) → General → Your apps → Web (`</>`)**, register an app (no hosting needed).
2. Copy the `firebaseConfig` values.
3. Open `firebase-config.js` in this folder and replace each `PASTE_...` value. `databaseURL` looks like `https://your-project-default-rtdb.firebaseio.com` (or `...firebasedatabase.app` for non-US regions). If it's missing from the config, copy it from the top of the Realtime Database **Data** tab.

## 4. Publish
Commit and push all files to your GitHub Pages repo as usual (including `firebase-config.js` and the updated `sw.js`). Each phone picks up the update the next time it opens the app online. Open the app once with signal so the service worker saves everything for offline use.

## Using it
- **Organizer**: nothing new to do. Set up, tap **Invite helpers (QR)**, start the race. The line under the title shows `Live — N helpers sending`.
- **Helpers**: scan the invite as before. Taps upload automatically. Once the organizer starts the race, the helper screen shows the running race clock, each tap's race time, the field's current pace, and under each name: how far ahead/behind goal pace they are, estimated arrival at your marker, and their current pace (the clock and estimates keep working if signal drops, using the last race info the phone received). If signal drops, taps stay on the phone and upload by themselves when a connection returns, even if the app was closed and reopened.
- **Offline mode** (checkbox on the first screen, and on the helper screens): turns all internet use off. Splits are still saved on the phone, and **Send to organizer** / **Import splits** (QR) work exactly as before. Turning offline mode off uploads anything waiting.
- If the organizer adds, renames or removes a runner, or adds a marker during the race, helpers' lists update by themselves. On the helper timing screen, **Sort waiting by arrival** orders the runners not yet timed by estimated arrival.
- Late helpers can upload after the race is finished; the organizer's phone still receives them while that race is open.

## Housekeeping
- Race data is tiny. To clear old races, delete the `races` node in the console's **Data** tab.
- Free-plan Realtime Database limits (check the Firebase pricing page for current numbers) are far above what a team's meet needs.
