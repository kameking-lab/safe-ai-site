export type LengthUnit = "mm" | "cm" | "m";
export type AreaUnit = "mm2" | "cm2" | "m2";
export type VolumeUnit = "L" | "m3";
export type MassUnit = "kg" | "t";
export type DensityUnit = "kg/m3" | "t/m3";

export type RoundingMode = "round" | "ceil" | "floor";

export interface RoundingConfig {
  decimalPlaces: number;
  mode: RoundingMode;
}

export type PortableValue =
  | boolean
  | number
  | string
  | null
  | PortableValue[]
  | { [key: string]: PortableValue };

export interface ValidationIssue {
  field: string;
  code:
    | "required"
    | "not-finite"
    | "zero"
    | "negative"
    | "out-of-range"
    | "inconsistent"
    | "too-large";
  message: string;
}

export interface DisplayValue {
  key: string;
  label: string;
  value: number | string;
  unit: string;
}

export interface CalculationResult {
  calculatorId: string;
  formulaVersion: string;
  outputs: Record<string, PortableValue>;
  rawOutputs: Record<string, PortableValue>;
  displayValues: DisplayValue[];
  usedInputs: Record<string, PortableValue>;
  formula: string[];
  rounding: RoundingConfig;
  assumptions: string[];
  warnings: string[];
  isEstimate: true;
}

export type CalculationOutcome =
  | { ok: true; result: CalculationResult }
  | { ok: false; errors: ValidationIssue[] };

export type CalculatorFunction<TInput> = (input: TInput) => CalculationOutcome;

export interface FormulaSource {
  sourceId: string;
  title: string;
  publisher: string;
  url: string;
  applicableYear: string | null;
  locator: string;
  checkedAt: string;
  sourceKind: "official" | "mathematical-derivation";
}

export interface InputDefinition {
  key: string;
  label: string;
  type: "number" | "select" | "integer" | "segments";
  required: boolean;
  units?: readonly string[];
  options?: readonly string[];
  min?: number;
  max?: number;
  condition?: string;
  itemDefinitions?: readonly InputDefinition[];
  help: string;
}

export interface OutputDefinition {
  key: string;
  label: string;
  unit: string;
  integer?: boolean;
}

export interface RegistryTestFixture {
  fixtureId: string;
  kind:
    | "normal"
    | "unit-conversion"
    | "boundary"
    | "zero"
    | "negative"
    | "large"
    | "rounding";
  input: Record<string, unknown>;
  expectedOk: boolean;
  expectedOutputs?: Record<string, number | string | boolean>;
  expectedErrorField?: string;
  tolerance?: number;
  derivation: string;
}

export interface FormulaRegistryEntry {
  calculatorId: string;
  slug: string;
  title: string;
  category: string;
  purpose: string;
  formula: readonly string[];
  formulaVersion: string;
  inputDefinitions: readonly InputDefinition[];
  outputDefinitions: readonly OutputDefinition[];
  supportedUnits: readonly string[];
  roundingRule: string;
  assumptions: readonly string[];
  sources: readonly FormulaSource[];
  checkedAt: string;
  riskLevel: "low";
  clientOnly: true;
  testFixtures: readonly RegistryTestFixture[];
}
