# Android client

This small Trusted Web Activity (TWA) uses Google's Android Browser Helper, the
same library used by Bubblewrap. The game still runs from the hosted PWA. The
launcher requests landscape and immersive sticky fullscreen, and asks for
Production or Development only on first start. Later starts open the saved
client directly; switch clients with the links on the login and lobby screens,
which navigate between the two trusted client origins. Each origin keeps its
own accounts, settings, caches and service-worker updates.

The wrapper needs a compatible TWA browser such as Chrome. Without a compatible
browser or valid Digital Asset Links, the browser may show its normal toolbar.
System gestures can temporarily reveal Android's system bars. Verify landscape,
cutouts, audio, suspend/reconnect and environment switching on a physical phone.

## One-time signing and domain verification

The application ID is `com.rabimimi.riichi`. Shared public configuration lives in
`client-config.json`; it feeds the web links, Android build and Digital Asset
Links. Keep the application ID and release signing key stable for future APK
updates. Back up the key outside this repository.

1. Create a release signing keystore using Android Studio's **Generate Signed
   Bundle / APK**, or `keytool -genkeypair -keystore rabiriichi.jks -alias
rabiriichi -keyalg RSA -keysize 2048 -validity 10000`. Keep the keystore and
   passwords private. Do not send them in chat or commit them.
2. Add these repository **Actions secrets**:

   | Secret                      | Value                                   |
   | --------------------------- | --------------------------------------- |
   | `ANDROID_KEYSTORE_BASE64`   | Base64-encoded contents of the keystore |
   | `ANDROID_KEYSTORE_PASSWORD` | Keystore password                       |
   | `ANDROID_KEY_ALIAS`         | Signing key alias, e.g. `rabiriichi`    |
   | `ANDROID_KEY_PASSWORD`      | Signing key password                    |

3. Run `keytool -list -v -keystore rabiriichi.jks -alias rabiriichi` and copy the
   **SHA256** certificate fingerprint. It is public and safe to share. Add it to
   `sha256CertFingerprints` in `client-config.json`, or set the Cloudflare build
   environment variable `ANDROID_SHA256_CERT_FINGERPRINTS` on **both** deployments
   (comma-separated values when trusting multiple certificates). The environment
   variable overrides the checked-in list. Only public fingerprints enter Vite.
4. Deploy both domains normally. `npm run build` emits
   `dist/.well-known/assetlinks.json`; Workers Static Assets can serve it directly
   with the rest of `dist`. `public/_headers` supplies its JSON content type and
   a five-minute cache lifetime. No separate Worker endpoint is needed. If a
   custom Worker intercepts all requests, forward this path to the assets binding.
5. Confirm **both** URLs return HTTP 200 JSON without redirects, login, Cloudflare
   Access or challenge pages:

   - <https://riichi.rabimimi.com/.well-known/assetlinks.json>
   - <https://riichi-dev.rabimimi.com/.well-known/assetlinks.json>

6. Run the **Android APK** workflow from `main` for the initial signed release.
   Its `certificate-fingerprint.txt` asset provides the public fingerprint to
   put into Cloudflare's build environment. It also publishes a ready-made
   `assetlinks.json` derived from the actual signed APK for cross-checking.
   The download button targets the stable `android-latest`
   release asset. Before the initial release, that URL has no APK to download.

With no fingerprint configured the generated file is `[]`: web builds remain
usable but APK trust is intentionally not claimed. Never publish dummy hashes.
For a future Google Play release, also trust the **Play App Signing** certificate
fingerprint; it can differ from the sideloaded APK's certificate.

## Automatic APK releases

`.github/workflows/android-release.yml` builds and lints Android changes on pull
requests. A push to **main** affecting `android/**` or the workflow builds a signed
APK, publishes a versioned `android-<run number>` GitHub release, and replaces
`RabiRiichi.apk` on the `android-latest` release used by the download button.
Manual dispatch can also publish from `main`; other branches never publish.
The workflow fails clearly if signing secrets have not been configured. Workflow
run numbers provide increasing Android version codes; keep the workflow identity
stable or ensure replacement workflows continue above the last published code.

Normal React, CSS, asset and game changes only need the existing Cloudflare
deployment. The PWA updater checks hourly and asks to reload outside games and
replays. Changes to the launcher, native dependencies, application permissions or
Android metadata need a new APK. Installing a newer APK signed with the same key
upgrades the existing app; uninstalling is unnecessary.

## Local builds

Install JDK 17+, Android SDK platform 36 and build tools 36.0.0, then set
`ANDROID_HOME` to the SDK directory (or use an ignored `local.properties`).
From `android/`:

```sh
bash gradlew lint assembleDebug
bash gradlew assembleRelease
```

On Windows use `gradlew.bat`. For signed release builds set `ANDROID_KEYSTORE_PATH`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` in the
shell environment. Without them, a local release build produces an unsigned APK.
Debug builds use Android's local debug certificate, which is deliberately not
trusted by the production sites. Use the release APK for the toolbar-free test,
or temporarily add your debug fingerprint to the **development** site's build
environment. Avoid trusting a debug certificate on production.
