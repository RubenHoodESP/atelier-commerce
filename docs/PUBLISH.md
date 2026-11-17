# Publication runbook

The private repository is [RubenHoodESP/atelier-commerce](https://github.com/RubenHoodESP/atelier-commerce), with default branch `master`. The original local foundation commit is `128e785`; publication through the GitHub API can create different commit IDs. Preserve that local commit as a backup when synchronizing the published history.

1. Reuse the existing repository; inspect its default branch before publishing.
2. Use an authenticated Git client. Never paste a token into a command, file, remote URL or chat.
3. From this checkout, inspect `git status --short`, `git log -1 --oneline` and `git remote -v`.
4. Set origin only after confirming the account and destination. The expected URL is `https://github.com/RubenHoodESP/atelier-commerce.git`.
5. Push the synchronized `master` branch using an authenticated client, or publish through the connected GitHub account when terminal networking is unavailable.
6. Verify remote paths/content and the default-branch SHA. Update `STATUS.md` after publication; do not claim success from a local commit alone.

If the repository was initialized elsewhere, fetch and inspect it before integrating. Do not overwrite it or force-push. The task authorizes publishing this project's files, not the CV, job PDF, salary context or unrelated workspace files.

PowerShell example after synchronizing the published history and configuring authentication:

```powershell
git remote -v
git push -u origin master
git ls-remote origin refs/heads/master
```
