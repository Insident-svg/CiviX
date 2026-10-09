# CIVIX Emergency Response & Relief Optimization

This module extends the existing CIVIX grievance platform with an emergency workspace, incident/report records, a resource inventory, allocation proposals, assignment tracking, and relief outcomes.

## Included in this integration

- Red Emergency navigation item for citizen, officer, and admin workspaces.
- Authenticated emergency reporting with rule-assisted triage and optional Groq structured triage.
- Incident creation and activation for officers/admins.
- Simulated flood/medical incident scenario with reports and inventory.
- Constraint-aware, deterministic resource allocation proposals.
- Human approval before resources are reserved and assignments are created.
- Assignment status lifecycle and relief outcome recording.
- Role-sensitive overview responses; citizens see their own reports and public incident summaries, while operational controls require officer/admin roles.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and set the MongoDB URL, JWT secret, frontend URL, and other existing CIVIX settings.
2. Copy `frontend/.env.example` to `frontend/.env.local` if needed and set `VITE_API_URL=http://localhost:5000`.
3. Optional AI triage: set `GROQ_API_KEY` in `backend/.env`. If omitted or the API fails, rule-assisted triage is used. The Groq key is server-only and must never be added to the frontend environment.
4. Install dependencies with `npm ci` in both `backend` and `frontend`.
5. Start the backend with `npm run dev` in `backend` and the frontend with `npm run dev` in `frontend`.
6. Sign in as an officer or admin, open **Emergency Response**, and select **Load demo scenario**.
7. Select **Optimize allocation**, review the proposed allocations and unmet needs, then approve the plan to create assignments.
8. Update assignment statuses and record relief activity to demonstrate outcome tracking.

## Emergency API routes

- `GET /api/emergency/overview`
- `POST /api/emergency/reports`
- `POST /api/emergency/reports/:id/link-incident` (officer/admin)
- `POST /api/emergency/incidents` (officer/admin)
- `POST /api/emergency/incidents/:id/activate` (officer/admin)
- `POST /api/emergency/resources` (officer/admin)
- `POST /api/emergency/simulate` (officer/admin)
- `POST /api/emergency/allocations/optimize` (officer/admin)
- `POST /api/emergency/allocations/:id/approve` (officer/admin)
- `PATCH /api/emergency/assignments/:id/status` (officer/admin)
- `POST /api/emergency/relief` (officer/admin)

## Important limitations

- The included allocation algorithm is a prototype heuristic, not a certified emergency dispatch system.
- Groq triage is optional and recommendations require human review. AI does not dispatch responders.
- The demo scenario is synthetic and is labelled as simulation data.
- Road routing, official emergency-service dispatch, live GPS team tracking, and external authority integrations are not included.
- Immediate danger must be reported through the applicable official emergency service. In India, call 112.
- Before production use, add formal disaster-response procedures, security review, audit retention policy, comprehensive automated tests, load tests, and validation with qualified emergency-management personnel.

## Data models added

- `EmergencyIncident`
- `EmergencyReport`
- `EmergencyResource`
- `EmergencyAllocationPlan`
- `EmergencyAssignment`
- `EmergencyRelief`

## Citizen emergency reporting (shared guided intake)

Citizen intake in the Emergency Response tab now opens the same five-step guided reporting flow used by grievance reporting. It reuses the existing Leaflet/OpenStreetMap location picker, including GPS location and click-to-select coordinates, and supports image, video, and recorded voice evidence. Emergency-specific fields capture hazard type, estimated affected people, and area/landmark. The emergency report is saved through `/api/emergency/reports` with GeoJSON coordinates in `[longitude, latitude]` order and uploaded evidence metadata; emergency triage still runs server-side and remains subject to coordinator review. Successful submissions show an emergency-specific confirmation and report code.
