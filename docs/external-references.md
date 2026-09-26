# External references

- Google OAuth native apps: https://developers.google.com/identity/protocols/oauth2/native-app
  - Installed apps should use Authorization Code + PKCE.
  - Native apps cannot keep a client secret; use a public client ID.
  - Desktop apps can use loopback redirect; mobile apps use an app scheme/deep link.
- Google Drive uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads
  - Drive supports simple, multipart, and resumable uploads.
  - PATCH is used to update an existing file.
- Google OAuth verification: https://support.google.com/cloud/answer/13461325?hl=en
  - Create a Google Cloud project, enable APIs, configure consent screen, and submit for verification when required by scopes/distribution.
- Expo WebBrowser: project-local Expo SDK 54 docs at `docs/navigation/webbrowser/DOCS.md`
  - `openAuthSessionAsync` is intended for auth flows and redirects to the configured app scheme.
- Expo Linking: project-local Expo SDK 54 docs at `docs/navigation/linking/DOCS.md`
  - Stable custom-scheme redirects require a development or production build rather than Expo Go.
- Expo Crypto: project-local Expo SDK 54 docs at `docs/auth/crypto/DOCS.md`
  - Use `getRandomBytesAsync` and SHA-256 for secure PKCE material.
