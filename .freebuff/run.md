# Run doc — alquranku (Expo)

## Reproduce artifacts (fresh checkout)

1. Install dependencies with npm (project uses npm, see `package-lock.json`):
   ```
   npm install
   ```
2. No env files are needed — the app has no `.env.local` / secrets; all data comes from
   public APIs (equran.id, api.quran.com) and `AsyncStorage` on the device/browser.
   This thread's workspace IS the main checkout (`S:\sementara haikal\alquranku`),
   so there is nothing to copy.
3. Optional sanity check (full Android bundle, catches import errors):
   ```
   npx expo export --platform android --output-dir /tmp/alquranku-export
   ```

## Run the dev server (web preview)

- Command: `npm run web -- --port 8100 --offline`
  (= `expo start --web`), run from the project root.
- `CI=1` should be set in the environment so Expo never prompts interactively.
- Port **8100**: still current (preview alive as of this run).
  bundle** for the browser's exact bundle URL (incremental edits kept silently
  failing). When source edits do not appear in the preview, DO NOT trust the
  same port — move to the next port AND restart Metro, then re-register the preview.
- Detached start recipe used on Windows (stdout and stderr go to different files):
  ```
  powershell -NoProfile -Command '$env:CI="1"; (Start-Process -FilePath "npm.cmd" -ArgumentList "run","web","--","--port","8100","--offline" -RedirectStandardOutput "<log>" -RedirectStandardError "<log>.err" -WindowStyle Hidden -PassThru).Id'
  ```
  where `<log>` = `.freebuff\preview-e036ed2d-c1e0-4684-86c0-d5778093e769.log`.
- Confirm alive: `powershell -NoProfile -Command "Get-Process -Id <pid>"`,
  then wait for the newly registered preview URL (as recorded above) to answer HTTP 200 before declaring the preview ready.
- First page load compiles the web bundle and can take ~1–2 minutes.
- Deep-link smoke test: `http://localhost:8100/#/SurahList?initialTab=page`
  (App.js parses hash deep-links incl. params; a `hashchange` listener switches
  screens live, but a same-hash reload returns to Home — force a full reload
  when in doubt).
