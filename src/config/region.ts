// Puget Sound region, including Admiralty Inlet, the eastern Strait of
// Juan de Fuca and the San Juan Islands, where most Puget Sound orcas pass.
export const REGION = {
  name: 'Puget Sound',
  south: 46.95,
  north: 48.8,
  west: -123.6,
  east: -122.1,
  center: [47.75, -122.6] as [number, number],
  zoom: 9,
};

export function inRegion(lat: number, lng: number): boolean {
  return lat >= REGION.south && lat <= REGION.north && lng >= REGION.west && lng <= REGION.east;
}

export const REGION_WKT = `POLYGON((${REGION.west} ${REGION.south},${REGION.east} ${REGION.south},${REGION.east} ${REGION.north},${REGION.west} ${REGION.north},${REGION.west} ${REGION.south}))`;
