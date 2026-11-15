import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as Cesium from 'cesium';

import { useMapStore } from '@/store/useMapStore';
import { useVehiclesStore } from '@/store/useVehiclesStore';
import { useTrafficStore } from '@/store/useTrafficStore';
import { useSimulationStore } from '@/store/useSimulationStore';
import type { Vehicle, RoadSegment, TrafficEvent } from '@/types';
import { advanceVehicle, buildSimVehicles } from '@/lib/simulation';

// center coords

const CAT_COLOR: Record<string, Cesium.Color> = {
  car: Cesium.Color.fromCssColorString('#22d3ee'),
  bus: Cesium.Color.fromCssColorString('#a78bfa'),
  motorcycle: Cesium.Color.fromCssColorString('#f472b6'),
  truck: Cesium.Color.fromCssColorString('#fbbf24'),
  ambulance: Cesium.Color.fromCssColorString('#ef4444'),
  fire_engine: Cesium.Color.fromCssColorString('#dc2626'),
  police: Cesium.Color.fromCssColorString('#1d4ed8'),
};

function categoryColor(category: string): Cesium.Color {
  return CAT_COLOR[category] ?? Cesium.Color.WHITE;
}

function congestionColor(level: string): Cesium.Color {
  switch (level) {
    case 'low': return Cesium.Color.fromCssColorString('#22c55e');
    case 'moderate': return Cesium.Color.fromCssColorString('#eab308');
    case 'heavy': return Cesium.Color.fromCssColorString('#f59e0b');
    case 'severe': return Cesium.Color.fromCssColorString('#ef4444');
    default: return Cesium.Color.fromCssColorString('#64748b');
  }
}

export interface MapViewProps {
  onViewerReady: (viewer: Cesium.Viewer) => void;
}

export default function MapView({ onViewerReady }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  const setViewer = useMapStore((s) => s.setViewer);
  const selectVehicle = useMapStore((s) => s.selectVehicle);
  const selectRoad = useMapStore((s) => s.selectRoad);

  const vehicles = useVehiclesStore((s) => s.vehicles);
  const roads = useTrafficStore((s) => s.roads);
  const events = useTrafficStore((s) => s.events);
  const simEnabled = useSimulationStore((s) => s.enabled);
  const simVehicleCount = useSimulationStore((s) => s.vehicleCount);
  const simTick = useSimulationStore((s) => s.tickIntervalMs);

  const roadEntities = useRef<Map<string, Cesium.Entity>>(new Map());
  const vehicleEntities = useRef<Map<string, Cesium.Entity>>(new Map());
  const eventEntities = useRef<Map<string, Cesium.Entity>>(new Map());
  let tickHandle: Cesium.Event.RemoveCallback | null = null;

  const BUILDINGS = useMemo(
    () =>
      [
        { id: 'bld-1', height: 45, color: '#94a3b8',
          positions: [[-122.3942, 37.7874],[-122.3936, 37.7874],[-122.3936, 37.7880],[-122.3942, 37.7880]] },
        { id: 'bld-2', height: 62, color: '#64748b',
          positions: [[-122.3928, 37.7890],[-122.3922, 37.7890],[-122.3922, 37.7896],[-122.3928, 37.7896]] },
        { id: 'bld-3', height: 38, color: '#475569',
          positions: [[-122.3910, 37.7876],[-122.3904, 37.7876],[-122.3904, 37.7882],[-122.3910, 37.7882]] },
      ] as const,
    [],
  );

  const initViewer = useCallback((viewer: Cesium.Viewer) => {
    viewerRef.current = viewer;
    setViewer(viewer);
    onViewerReady(viewer);

    for (const road of roads.values()) addRoadEntity(road);
    for (const ev of events) addEventEntity(ev);
    for (const b of BUILDINGS) addBuilding(b);
    for (const v of vehicles.values()) addVehicleEntity(v);

    if (simEnabled) {
      const simVehs = buildSimVehicles(Array.from(roads.values()), simVehicleCount);
      const roadMap = new Map(roads);
      const now = new Date().toISOString();
      for (const s of simVehs) {
        const road = roadMap.get(s.roadId);
        if (!road) continue;
        const startLon = start[0]; const startLat = start[1];
        const v: Vehicle = {
          id: s.id, category: s.category as any, label: s.label,
          position: [startLon, startLat, 0], heading: 0, speed: 0,
          lastUpdate: now, dataSource: 'simulation', routeId: s.roadId,
          roadProgress: 0, isEmergency: s.isEmergency, trackingHistory: [],
        };
        addVehicleEntity(v);
      }
    }

    tickHandle = viewer.clock.onTick.addEventListener(() => {
      if (simEnabled) {
        const dt = simTick / 1000;
        const roadMap = new Map(roads);
        const updates: { id: string; position: [number, number, number]; heading: number; speed: number }[] = [];
        for (const v of vehicles.values()) {
          if (v.dataSource !== 'simulation') continue;
          const road = roadMap.get(v.routeId!);
          if (!road) continue;
          const advanced = advanceVehicle(
            { ...v, roadProgress: v.roadProgress ?? 0, roadId: v.routeId! },
            road, dt,
          );
          updates.push({ id: advanced.id, position: advanced.position, heading: advanced.heading, speed: advanced.speed });
        }
        if (updates.length && typeof (window as any).__sr_updateVehicles === 'function') {
          (window as any).__sr_updateVehicles(updates);
        }
      }

      for (const [id, road] of roads) {
        const ent = roadEntities.current.get(id);
        if (!ent || !ent.polyline) continue;
        (ent.polyline as any).material = congestionColor(road.congestion);
        (ent.polyline as any).width = road.congestion === 'severe' ? 9 : 6;
      }

      for (const [vid, v] of vehicles) {
        const ent = vehicleEntities.current.get(vid);
        if (!ent) continue;
        const pos = Cesium.Cartesian3.fromDegrees(v.position[0], v.position[1], v.position[2]);
        ent.position = pos as any
        ent.orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, Cesium.Math.toRadians(v.heading), 0, 0);
        ent.label = {
          text: `${v.label}\n${Math.round(v.speed)} km/h · ${v.category}`,
          font: '12px sans-serif', fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          show: true,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 900),
        } as any;
      }

      for (const [_eid, ent] of eventEntities.current) {
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(viewer.clock.currentTime.secondsOfDay * 3));
        (ent as any).point = { pixelSize: 10 + 4 * pulse, color: Cesium.Color.RED.withAlpha(pulse) };
      }
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);
      if (!picked || !picked.id) return;
      const ent = picked.id as any
      if (ent._srType === 'vehicle') {
        selectVehicle(ent._srId);
        viewer.camera.flyTo({ destination: ent.position as any, offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 120), duration: 2.0 } as any);
      } else if (ent._srType === 'road') {
        selectRoad(ent._srId);
      } else if (ent._srType === 'event') {
        selectVehicle(null);
        viewer.camera.flyTo({ destination: ent.position as any, offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-60), 250), duration: 2.0 } as any);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }, [roads, events, vehicles, simEnabled, simVehicleCount, simTick, BUILDINGS, setViewer, selectVehicle, selectRoad, onViewerReady]);

  const addBuilding = useCallback((b: (typeof BUILDINGS)[number]) => {
    const viewer = viewerRef.current; if (!viewer) return;
    const positions = b.positions.map((p) => Cesium.Cartesian3.fromDegrees(p[0], p[1], 0));
    viewer.entities.add({
      id: b.id, _srType: 'building',
      polygon: {
        hierarchy: positions, extrudedHeight: b.height,
        material: Cesium.Color.fromCssColorString(b.color).withAlpha(0.85),
        outline: true, outlineColor: Cesium.Color.WHITE.withAlpha(0.4),
      } as any,
    });
  }, []);

  const addRoadEntity = useCallback((road: RoadSegment) => {
    const viewer = viewerRef.current; if (!viewer) return;
    const positions = Cesium.Cartesian3.fromDegreesArray(road.coordinates.flat() as number[]);
    const ent = viewer.entities.add({
      id: `road-${road.id}`, _srType: 'road', _srId: road.id, name: road.name,
      polyline: {
        positions, width: 6, material: congestionColor(road.congestion),
        arcType: Cesium.ArcType.NONE, clampToGround: true, depthTestGlobe: false,
      } as any,
    } as any);
    roadEntities.current.set(road.id, ent);
  }, [congestionColor]);

  const addEventEntity = useCallback((ev: TrafficEvent) => {
    const viewer = viewerRef.current; if (!viewer) return;
    const ent = viewer.entities.add({
      id: `event-${ev.id}`, _srType: 'event', _srId: ev.id,
      position: Cesium.Cartesian3.fromDegrees(ev.position[0], ev.position[1], 10),
      point: { pixelSize: 12, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
      label: { text: `⚠ ${ev.title}`, font: '14px sans-serif', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.RED, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -18) },
      description: ev.description,
    } as any);
    eventEntities.current.set(ev.id, ent);
  }, []);

  const addVehicleEntity = useCallback((v: Vehicle) => {
    const viewer = viewerRef.current; if (!viewer) return;
    const color = categoryColor(v.category);
    const size = v.isEmergency ? 10 : 7;
    const pos = Cesium.Cartesian3.fromDegrees(v.position[0], v.position[1], v.position[2]);
    const ent = viewer.entities.add({
      id: `veh-${v.id}`, _srType: 'vehicle', _srId: v.id, position: pos as any,
      orientation: Cesium.Transforms.headingPitchRollQuaternion(pos, Cesium.Math.toRadians(v.heading), 0, 0),
      box: { dimensions: new Cesium.Cartesian3(size, size * 1.7, size * 1.1), material: color.withAlpha(0.95), outline: true, outlineColor: Cesium.Color.WHITE.withAlpha(0.6) },
      label: { text: `${v.label}`, font: '11px sans-serif', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -14), distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 700) },
      path: { show: true, leadTime: 0, trailTime: 600, width: 2, material: new Cesium.PolylineGlowMaterialProperty({ color: color.withAlpha(0.5), glowPower: 0.2 }) },
    } as any);
    vehicleEntities.current.set(v.id, ent);
  }, []);

  useEffect(() => {
    (window as any).__sr_updateVehicles = (updates: any[]) => {
      for (const u of updates) {
        const v = vehicles.get(u.id); if (!v) continue;
        const ent = vehicleEntities.current.get(u.id); if (!ent) continue;
        const pos = Cesium.Cartesian3.fromDegrees(u.position[0], u.position[1], u.position[2]);
        ent.position = pos as any
        ent.orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, Cesium.Math.toRadians(u.heading), 0, 0);
        ent.label = { text: `${vehicles.get(u.id)?.label ?? u.id}\n${Math.round(u.speed)} km/h`, font: '11px sans-serif', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -14), distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 700) } as any;
      }
    };
    return () => { delete (window as any).__sr_updateVehicles; };
  }, [vehicles]);

  useEffect(() => {
    for (const road of roads.values()) { if (!roadEntities.current.has(road.id)) addRoadEntity(road); }
  }, [roads, addRoadEntity]);

  useEffect(() => {
    for (const ev of events) { if (!eventEntities.current.has(ev.id)) addEventEntity(ev); }
  }, [events, addEventEntity]);

  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new Cesium.Viewer(containerRef.current, {
      terrainProvider: new Cesium.CesiumTerrainProvider({ requestWaterMask: true, requestVertexNormals: true }),
      imageryProvider: new Cesium.OpenStreetMapImageryProvider(),
      shouldAnimate: true,
    } as any);
    initViewer(viewer);
    return () => {
      if (tickHandle) { tickHandle(); tickHandle = null; }
      viewer.destroy();
      viewerRef.current = null;
      setViewer(null as any);
    };
  }, []);

  return (
    <div ref={containerRef} className="cesium-container" style={{ width: '100%', height: '100%' }} />
  );
}

