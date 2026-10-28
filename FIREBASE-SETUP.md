# Turning on live sync (Firebase, free plan)

The app works without any of this (QR codes only). Do these steps once to let helpers' splits reach the organizer automatically. Only the organizer needs an access code for this; helpers never do.

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
    "codes": {
      "$code": {
        ".read": true,
        ".write": false
      }
    },
    "races": {
      "$rid": {
        ".write": "$rid.length <= 12 && !newData.exists()",
        "k": {
          ".write": "$rid.length <= 12 && newData.isString() && newData.val().matches(/^[A-Z0-9][A-Z0-9_-]{2,31}$/) && root.child('codes').child(newData.val()).child('expires').val() > now && (!data.exists() || data.val() == newData.val() || !(root.child('codes').child(data.val()).child('expires').val() > now))"
        },
        "h": {
          ".read": "$rid.length <= 12",
          "$hid": {
            ".write": "$rid.length <= 12 && $hid.length <= 16 && root.child('codes').child(root.child('races').child($rid).child('k').val()).child('expires').val() > now",
            ".validate": "newData.hasChildren() || !newData.exists()"
          }
        }
      }
    }
  }
}
```

What these rules do:

- **Nobody can list or browse the database.** You can only read a race's data (`h`) if you know its random race code.
- **Nobody can create or change access codes from the app or the web.** Only you can, in the Firebase console (the console ignores rules).
- **A live race can only be started with a valid access code.** The organizer's phone tags the race with the code (`races/{race}/k`). Helpers and the organizer can only write to a race while that code exists in `codes` and hasn't passed its `expires` time. Without a code, nobody can create races or fill your database with junk.
- **Helpers never need a code.** They scan the QR and their phones write under `h`, as long as the organizer's code is still valid.
- Anyone who knows a race's code can still delete that race (the organizer's phone does this when the race ends).

### Access codes (you create these)

In **Realtime Database → Data**, add a child under `codes`. The name is the code people type, **UPPERCASE** letters, numbers, `-` or `_`, 3 to 32 characters. Use something hard to guess, like `MEET-SAT-K7Q2X9`, because anyone who guesses a code can use Live sync until it expires.

| Field | Example | Meaning |
|--------|---------|--------|
| `expires` | `1794718740000` | When the code stops working, as a **number** in milliseconds since 1970 (an "epoch milliseconds" converter on the web will make one from a date and time) |

Example: a code that works until Saturday Nov 14, 2026 at 11:59 PM Eastern:

```
codes/
  MEET-SAT-K7Q2X9/
    expires: 1794718740000
```

Notes:
- Anyone who has the code can use it until it expires. There is no use limit, so only share it with people you trust.
- A phone that entered a code stops publishing live splits when it expires. A race already running keeps accepting helper splits only until its code expires too, so set `expires` after the end of the meet.
- To turn a code off early, delete it in the console.
- Codes from older versions (with `maxUses`, `used`, `host`, `live`, `hours`) don't work anymore. Delete them and create new ones with `expires`.
- Publish the updated app (step 4) **before** you publish these rules, or phones still running the old version won't be able to use Live sync until they update.

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
