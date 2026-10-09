# CiviX Social, Voice and Public Feed Fixes

## 1. Voice is report input, not separate voice evidence
- Removed Voice Upload from the Evidence step.
- Added a single **Speak instead** control on the Description step.
- Recorded WebM voice is still uploaded as `voice` media.
- AI Speech-to-Text uses the voice media for classification/routing.
- Voice-only reports can be submitted without typed text.

## 2. One vote per user per grievance
- The `(postId, userId)` unique MongoDB index remains enforced.
- Vote writes now use an atomic upsert and handle duplicate-key races.
- Startup repair removes legacy duplicate vote documents before syncing indexes.
- The frontend no longer blindly increments counts on every click.
- Clicking the same vote again removes that vote; switching vote changes the existing vote instead of creating another one.

## 3. Public feed priority by coverage
Coverage is now:

`upvotes + downvotes + comments`

The normal public feed sorts by:
1. Coverage descending
2. Impact score descending
3. Newest first

Nearby/geo feed ordering remains location-based.

## 4. AI-generated public description
Each grievance now stores:
- `title` — typed report keeps the citizen's input as the heading.
- `summary` — AI-generated short public description.

For voice-only reports:
- AI transcribes the voice.
- AI generates the heading.
- AI generates the short description.
- The original voice remains attached as media.
- The transcript is stored as the grievance's raw `text` so AI routing and government workflows can use it.

## Validation
- AI engine tests: 29 passed.
- Python syntax checks passed.
- Backend/frontend TypeScript syntax was checked; full dependency-based build should be run after installing project dependencies locally.
