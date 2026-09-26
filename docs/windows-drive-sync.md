# Windows Google Drive sync

Windows now uses the Desktop OAuth refresh token from Credential Manager to:

1. Refresh an access token.
2. Find `quan-ly-chan-nuoi-ga-data-v2.json` in `appDataFolder`.
3. Download and normalize the remote schema v2 document.
4. Merge records with the local envelope using `updatedAt` and `deviceId`.
5. Upload the merged document when local changes are pending or when the Drive file does not exist.
6. Keep remote revision/file ID and clear pending changes after a successful upload.

The sync button reports conflicts from same-time updates and delete-vs-update merges. The frontend does not store refresh tokens in `localStorage`.
