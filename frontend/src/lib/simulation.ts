/**
 * Road-constrained traffic simulation engine.
 *
 * Vehicles move along real road linestrings using Turf.js interpolation.
 * All data produced here is clearly labelled 'simulation' and is intended only
 * to demonstrate the platform when no live GPS / camera feeds are configured.
 */

import { along } from '@turf/turf';
import type { LineString, Point } from '@turf/turf';
import type { Vehicle, RoadSegment } from '@/types';

const SIM_SPEED_KMH = 35; // base simulated speed

export interface SimVehicleInput {
  id: string;
  category: string;
  label: string;
  roadId: string;
  isEmergency: boolean;
  dataSource: 'simulation';
}

export function buildSimVehicles(
  roads: RoadSegment[],
  count: number,
): SimVehicleInput[] {
  const vehicles: SimVehicleInput[] = [];
  const roadPool = roads.filter((r) => r.coordinates.length >= 2);
  if (roadPool.length === 0) return vehicles;

  const prefixes = ['C-', 'MUNI ', 'FEDEX ', 'MEDIC ', 'SFPD ', 'ENGINE '];
  for (let i = 0; i < count; i++) {
    const road = roadPool[i % roadPool.length];
    const cat = i % 3 === 0 ? 'ambulance' : i % 3 === 1 ? 'police' : 'car';
    vehicles.push({
      id: `sim-veh-${i + 1}`,
      category: cat,
      label: `${prefixes[i % prefixes.length]}${1000 + i}`,
      roadId: road.id,
      isEmergency: cat === 'ambulance' || cat === 'police',
      dataSource: 'simulation',
    });
  }
  return vehicles;
}

/** Advance a vehicle one tick along its road, wrapping at the end. */
export function advanceVehicle(
  veh: Vehicle & { roadProgress: number; roadId: string },
  road: RoadSegment,
  dtSec: number,
): Vehicle & { roadProgress: number } {
  const coords = road.coordinates;
  if (coords.length < 2) return { ...veh, roadProgress: veh.roadProgress };

  // Build a turf LineString from [lon, lat] coords
  const line: LineString = {
    type: 'LineString',
    coordinates: coords as [number, number][],
  };

  // Total length in meters
  const lengthM = (line as any).properties?.lengthM ?? computeLength(line);

  const speedMps = (veh.speed || SIM_SPEED_KMH) * (1000 / 3600);
  const distM = speedMps * dtSec;

  let progress = veh.roadProgress + distM / Math.max(lengthM, 1);
  if (progress >= 1) progress = 0; // loop back to start of road

  const point = along(line, progress * lengthM) as unknown as Point;
  const [lon, lat] = point.coordinates as [number, number];

  // Heading = direction to a slightly ahead point on the road
  const ahead = Math.min(progress + 0.005, 0.999);
  const p2 = along(line, ahead * lengthM) as unknown as Point;
  const [lon2, lat2] = p2.coordinates as [number, number];
  const heading = bearing([lon, lat], [lon2, lat2]);

  const alt = 0; // clamp to ground in the renderer
  const speedKmh = veh.isEmergency ? 55 : 25 + Math.random() * 15;

  return {
    ...veh,
    roadProgress: progress,
    position: [lon, lat, alt],
    heading,
    speed: speedKmh,
    lastUpdate: new Date().toISOString(),
  };
}

function computeLength(line: LineString): number {
  let total = 0;
  for (let i = 1; i < line.coordinates.length; i++) {
    const a = line.coordinates[i - 1] as [number, number];
    const b = line.coordinates[i] as [number, number];
    total += haversineM(a[0], a[1], b[0], b[1]);
  }
  return total;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const h =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearing(p1: [number, number], p2: [number, number]): number {
  const [lon1, lat1] = p1;
  const [lon2, lat2] = p2;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let brg = (Math.atan2(y, x) * 180) / Math.PI;
  brg = (brg + 360) % 360;
  return brg;
}

export function randomCategoryPosition() {
  // placeholder export
  return { lon: 0, lat: 0 };
}

