# CiviX AI Support Fix

## Fixed
- AI Support now understands department/routing questions such as:
  - "which department are my grievances in"
  - "what department is my grievance routed to"
  - "who is my grievance assigned to"
- The assistant returns each of the user's five most recent grievances with:
  - grievance ID
  - department name
  - current status
- Department names are human-readable and use the 9 CiviX routing departments.
- It uses the populated `departmentId` as the primary source and falls back to the AI `departments[]` code for older/legacy grievances.
- The generic "recent grievances" response no longer overrides department questions.
- The frontend assistant preserves line breaks in multi-grievance responses.
- Added a citizen quick prompt: "Which department are my grievances in?"

## Example
Question:
"Can you please elaborate which department my grievances are in?"

Response:
"Here are your 2 most recent grievance(s) and their departments:
• CIV-... — Road Department (assigned)
• CIV-... — Healthcare Department (in progress)

Each grievance is automatically routed by the CiviX AI to the appropriate department."
