# CIVIX Live Emergency Map

The Emergency Response screen now includes a Leaflet/OpenStreetMap situational map with independently toggleable layers for active incidents, citizen emergency reports, resource inventory, and shelter beds. It refreshes emergency overview data every 30 seconds and also has a manual refresh action.

## Location data
- Incident and resource creation accept optional latitude and longitude; both must be provided together. Coordinates are stored as GeoJSON `[longitude, latitude]`.
- Citizen emergency report coordinates are plotted from the location selected during report submission.
- Shelter beds and resources are plotted only when their record has coordinates. Records without coordinates remain in the inventory/list and are not assigned guessed locations.
- The built-in demo scenario includes clearly simulation-labelled map locations around Raipur so the map has representative markers for a demo. Do not present these demo coordinates as live incidents.

## Map dependencies
The frontend reuses the project's existing Leaflet 1.9.4 CDN-loading pattern and OpenStreetMap tiles. Internet access is required for map tiles and the Leaflet CDN.
