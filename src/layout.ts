export const DEFAULT_LIBRARY_SIZE = 200;
export const MIN_LIBRARY_SIZE = 120;
export const MAX_LIBRARY_SIZE = 480;

export const librarySizeLimit = (available: number): number =>
  Math.max(MIN_LIBRARY_SIZE, Math.min(MAX_LIBRARY_SIZE, available - 246));

export const clampLibrarySize = ({
  requested,
  available,
}: {
  requested: number;
  available: number;
}): number =>
  Math.max(MIN_LIBRARY_SIZE, Math.min(librarySizeLimit(available), requested));
