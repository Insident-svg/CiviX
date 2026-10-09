# CIVIX Emergency Response Integration

This version integrates the Emergency Response tab into the uploaded original CIVIX project, preserving the original grievance, officer-resolution, authentication, profile, analytics, and administration flows.

## Access
- Citizens: Emergency tab, guided emergency report, live map, and public emergency overview.
- Officers: Emergency Response, citizen report review, incident creation, resource inventory, demo scenario, allocation proposals, assignments, and relief tracking.
- Administrators: Emergency Response coordination and oversight. Citizen intake is not embedded in the admin workspace, and the demo scenario button is only shown to officers.

## Backend
Emergency endpoints are mounted under `/api/emergency`. MongoDB stores incidents, reports, resources, allocation plans, assignments, and relief records. AI triage is optional; rule-assisted triage remains the fallback. Operational dispatch still requires an authorized human approval.

## Setup
Use the original project instructions in `README.md`. Configure environment files from the included `.env.example` templates. Do not copy secrets into source control.
