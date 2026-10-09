CiviX WhatsApp Opt-in + Dummy POC Patch (v1)

FILES INCLUDED
- frontend/src/App.tsx
- frontend/src/index.css
- frontend/src/services/api.ts
- backend/src/models/Grievance.ts
- backend/src/models/User.ts
- backend/src/controllers/grievances.ts
- backend/src/routes/index.ts

WHAT THIS PATCH ADDS
1. A WhatsApp opt-in section at the final grievance review step.
2. Consent and Indian mobile number validation.
3. Private storage of the citizen's WhatsApp number on the User document.
4. A per-grievance WhatsApp opt-in flag and consent timestamp.
5. An officer-only POC assignment form on the officer's grievance detail screen.
6. Demo POC values prefilled for testing, clearly labeled as dummy data.
7. A backend PATCH /api/grievances/:id/poc route that allows only the officer assigned to that grievance to save its POC.
8. POC details displayed in the grievance detail view after saving.

HOW TO APPLY
Extract this ZIP into the existing `civix.V01` project folder and allow it to overwrite only the seven listed source files. Keep your existing `.env` files unchanged.

IMPORTANT STATUS
- TypeScript/TSX syntax transpilation passed for all changed TypeScript files.
- Full frontend/backend builds were not verified because project dependencies were not installed in this sandbox.
- This patch does NOT yet send real WhatsApp messages through OpenClaw. It implements the opt-in, data storage, and POC assignment UI/API first. OpenClaw delivery still needs to be connected to the actual OpenClaw WhatsApp extension/configuration.
- Do not use the prefilled demo POC contact for real messages. Replace it with an authorized official contact before live deployment.
