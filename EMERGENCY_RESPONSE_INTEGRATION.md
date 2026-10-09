# CIVIX Emergency Response Integration

This original CIVIX V01 project now includes the Emergency Response workspace.

## Roles
- Citizens can open Emergency Response and submit a report using the same five-step guided intake, including evidence and map/GPS location.
- Officers can review incoming reports, create/activate incidents, manage resources, load clearly labelled demo data, optimize allocations, approve plans, update assignments, and record relief.
- Administrators can oversee incidents, reports, resources, plans, assignments, and relief. The citizen report form and demo-scenario button are not shown in the admin workspace.

## Backend
Emergency API endpoints are registered under `/api/emergency`. Emergency records are stored in MongoDB using dedicated Mongoose models. Optional `GROQ_API_KEY` and `GROQ_MODEL` enable provider-backed triage; the controller has a rule-assisted fallback.

## Map
The live map uses Leaflet loaded from its public CDN and OpenStreetMap tiles. It refreshes every 30 seconds. Coordinates are stored in GeoJSON order `[longitude, latitude]`. Simulated map points are demo data and are not real incident reports.

## Safety
AI recommendations are advisory. Authorized coordinators must review and approve allocation plans; CIVIX does not automatically dispatch official emergency services. For immediate danger in India, call 112.
