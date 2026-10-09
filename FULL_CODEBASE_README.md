# CiviX Full Codebase - Consolidated

This is the full CiviX codebase with the latest requested changes merged in.

## Included changes
- Correct role-based workspace selection after authentication.
- Separate Admin Dashboard and System Overview purposes/screens.
- Immediate AI grievance routing to department/officer without waiting for admin approval.
- Admin manual reassignment to another officer in the same or another department.
- One seeded officer account per department.
- Operational audit trail retained: grievance submission, AI routing, AI failure, admin override, status changes, resolution submission, verification/reopening, government account creation, moderation, seed event, and officer login.
- Citizen LOGIN audit events are excluded from the admin audit-log view.
- Admin login is not treated as an officer-login alert.
- Role-specific notifications for citizens, officers, and admins.
- Officer login notifications are delivered to the admin.
- Notification unread counts use the actual unread total.

## Officer seed accounts
Government IDs:
- CIVIX-OFFICER-PWD
- CIVIX-OFFICER-WATER
- CIVIX-OFFICER-SANITATION
- CIVIX-OFFICER-ELECTRICAL
- CIVIX-OFFICER-SEWERAGE
- CIVIX-OFFICER-TRAFFIC
- CIVIX-OFFICER-POLICE
- CIVIX-OFFICER-OTHER

Development password: CiviX@12345

## After extracting
1. Install dependencies in backend and frontend if needed.
2. Run the backend seed once if the officer accounts are not already present:
   npm run seed
3. Start backend and frontend normally.

No database reseed is required just for notification/audit filtering if the accounts already exist.
