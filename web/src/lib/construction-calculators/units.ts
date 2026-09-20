import type {
  AreaUnit,
  DensityUnit,
  LengthUnit,
  MassUnit,
  VolumeUnit,
} from "./types";

const LENGTH_TO_METRES: Record<LengthUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
};

const AREA_TO_SQUARE_METRES: Record<AreaUnit, number> = {
  mm2: 0.000001,
  cm2: 0.0001,
  m2: 1,
};

const VOLUME_TO_CUBIC_METRES: Record<VolumeUnit, number> = {
  L: 0.001,
  m3: 1,
};

const MASS_TO_KILOGRAMS: Record<MassUnit, number> = {
  kg: 1,
  t: 1_000,
};

export const toMetres = (value: number, unit: LengthUnit): number =>
  value * LENGTH_TO_METRES[unit];

export const toSquareMetres = (value: number, unit: AreaUnit): number =>
  value * AREA_TO_SQUARE_METRES[unit];

export const toCubicMetres = (value: number, unit: VolumeUnit): number =>
  value * VOLUME_TO_CUBIC_METRES[unit];

export const toKilograms = (value: number, unit: MassUnit): number =>
  value * MASS_TO_KILOGRAMS[unit];

export const toKilogramsPerCubicMetre = (
  value: number,
  unit: DensityUnit,
): number => value * (unit === "t/m3" ? 1_000 : 1);
