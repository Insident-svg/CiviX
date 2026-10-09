# CiviX V01 Merged Build — Merge Notes

This archive combines the officer-resolution-fixed project with the POC/WhatsApp feature code.

## Merge strategy
- The Officer Resolution Fixed archive is the source of truth for core workflow and MongoDB update behavior.
- POC assignment UI/API/model fields and optional WhatsApp opt-in/service code are merged from civix.V01(4).zip.
- The fixed AI client and its tests are retained, including null transcript handling and invalid transcript validation.
- Generated dependency folders, build outputs, Python virtual environments, caches, and local `.env` files are excluded. Install dependencies locally and copy `.env.example` to `.env` before running.
- WhatsApp OpenClaw bridge is disabled by default. It requires a configured local Windows + WSL OpenClaw environment; it is not a hosted WhatsApp provider and does not guarantee message delivery.

## Important POC behavior note
The included POC implementation follows the uploaded feature archive: the assigned officer enters a contact on the grievance screen. It is not the separate automatic three-contacts-per-department rotation design. The demo phone number shown in the source UI is placeholder data and must not be treated as a real government contact.

## Validation status
Archive and source-level merge checks were performed. A full dependency installation, production build, live MongoDB test, AI-service integration test, and end-to-end browser workflow have not been certified by this archive operation. Run the commands below before deployment.

## Local validation
Backend: `cd backend && npm ci && npm run build && npm test`
Frontend: `cd frontend && npm ci && npm run build`
AI engine: create a fresh virtual environment, install `ai-engine/requirements.txt`, then run `pytest` from `ai-engine`.
