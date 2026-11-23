# MailFlow web demo

This repository now includes a zero-setup browser demo at the project root. It is a polished email-management experience that works without credentials, an API, or an email provider.

Open `index.html` directly, or serve the repository folder with any static server. The included GitHub Actions workflow publishes the root as a GitHub Pages site whenever `main` changes.

The demo includes:

- mailbox folders and labels
- search and quick filters
- starring, read/unread, bulk selection, archive, and trash actions
- message detail view with reply UI and attachment card
- compose, send, and save-to-drafts flows
- dark mode and responsive desktop/mobile layouts

The existing `backend/` and `frontend/` directories remain available for connecting this experience to real authentication, Gmail/Microsoft Graph, IMAP/SMTP, or another provider later.

