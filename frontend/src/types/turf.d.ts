declare module '@turf/turf' {
  export function along(line: any, distance: number, options?: any): any;
  export function interpolate(line: any, t: number, options?: any): any;
  export function destination(origin: any, distance: number, bearing: number, options?: any): any;
  export type LineString = any;
  export type Point = any;
}
