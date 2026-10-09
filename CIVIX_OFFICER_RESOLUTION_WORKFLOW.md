# CiviX Officer Acknowledgement & Resolution Workflow

## Workflow

ASSIGNED
→ Officer opens **Acknowledge** tab
→ **Acknowledge & Start Work**
→ `IN_PROGRESS` (and `acknowledgedAt` is stored)
→ Officer submits **Resolution Description**
→ `RESOLUTION_SUBMITTED`
→ Officer uploads **Final Photo Evidence**
→ `RESOLVED`

## Public feed

The public feed keeps the acknowledgement event using `acknowledgedAt` even though the
workflow immediately moves to `IN_PROGRESS`. The feed displays an **Acknowledged** tag.

## Officer tabs

Each officer sees an **Acknowledge** tab containing only grievances assigned to that officer
that are still `ASSIGNED`.

## API

- `PATCH /api/grievances/:id/status` with `{ "status": "ACKNOWLEDGED" }`
  performs acknowledgement and immediately moves the grievance to `IN_PROGRESS`.
- `POST /api/grievances/:id/resolution` submits the officer's written resolution description
  and moves the grievance to `RESOLUTION_SUBMITTED`.
- `POST /api/grievances/:id/resolution/photo` requires the final Cloudinary photo URL and
  moves the grievance to `RESOLVED`.

The final photo step is officer-only. Citizen verification cannot close a grievance early.
