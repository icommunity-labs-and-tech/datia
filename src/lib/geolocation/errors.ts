/**
 * Geolocation service errors
 */

export class GeolocationNotAvailableError extends Error {
  readonly _tag = "GeolocationNotAvailableError";
  constructor(message: string) {
    super(message);
    this.name = "GeolocationNotAvailableError";
  }
}

export class GeolocationPermissionDeniedError extends Error {
  readonly _tag = "GeolocationPermissionDeniedError";
  constructor(message: string) {
    super(message);
    this.name = "GeolocationPermissionDeniedError";
  }
}

export class InvalidCoordinatesError extends Error {
  readonly _tag = "InvalidCoordinatesError";
  constructor(message: string, public readonly coordinates?: unknown) {
    super(message);
    this.name = "InvalidCoordinatesError";
  }
}
