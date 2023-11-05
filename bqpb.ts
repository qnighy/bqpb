export function decodeBase64(b64: string): Uint8Array {
  const bLength = (b64 + "=").indexOf("=");
  const length = (bLength * 0.75) | 0;
  const arr = new Uint8Array(length);
  for (let i = 0; i < bLength; i++) {
    const ch = b64.charCodeAt(i);
    // |  char |     code |   value | offset |
    // |-------|----------|---------|--------|
    // |     + |       43 |      62 |    -19 |
    // |     / |       47 |      63 |    -16 |
    // | 0 - 9 | 48 -  57 | 52 - 61 |     -4 |
    // | A - Z | 65 -  90 |  0 - 25 |     65 |
    // | a - z | 97 - 122 | 26 - 51 |     71 |
    const val = ch - (
      ch >= 96 ? 71 : ch >= 64 ? 65 : ch >= 48 ? -4 : ch >= 47 ? -16 : -19
    );
    const j = (i * 0.75 + 0.75) | 0;

    // i = 0:
    //                         | 0  1  2  3  4  5| [i = 0]
    //                         | 0  1  2  3  4  5  6  7| [j = 0, << 2]
    //
    // i = 1:
    //                   | 6  7  8  9 10 11| [i = 1]
    // | 0  1  2  3  4  5  6  7| [j - 1 = 0, >> 4]
    //                         | 8  9 10 11 12 13 14 15| [j = 1, << 4]
    //
    // i = 2:
    //             |12 13 14 15 16 17| [i = 2]
    // | 8  9 10 11 12 13 14 15| [j - 1 = 1, >> 2]
    //                         |16 17 18 19 20 21 22 23| [j = 2, << 6]
    //
    // i = 3:
    //       |18 19 20 21 22 23| [i = 3]
    // |16 17 18 19 20 21 22 23| [j - 1 = 2, >> 0]
    //
    // OOB read will be undefined and OOB write will be ignored.
    // bits overflowed beyond MSB are truncated as if (x & 255) was applied.
    const val2 = val << (2 + i % 4 * 2);
    arr[j - 1] |= val2 >> 8;
    arr[j] |= val2;
  }
  return arr;
}

export function encodeBase64(arr: Uint8Array): string {
  const cps = new Array((((arr.length + 2) / 3) | 0) * 4);
  const bLength = ((arr.length * 4 + 2) / 3) | 0;
  for (let i = 0; i < bLength; i++) {
    const j = (i * 0.75 + 0.75) | 0;
    // We automatically get 0 for ToInt32(undefined)
    const val = (((arr[j - 1] << 8) | arr[j]) >> (2 + i % 4 * 2)) & 63;
    // |  char |     code |   value | offset |
    // |-------|----------|---------|--------|
    // | A - Z | 65 -  90 |  0 - 25 |     65 |
    // | a - z | 97 - 122 | 26 - 51 |     71 |
    // | 0 - 9 | 48 -  57 | 52 - 61 |     -4 |
    // |     + |       43 |      62 |    -19 |
    // |     / |       47 |      63 |    -16 |
    cps[i] = val +
      (val < 26 ? 65 : val < 52 ? 71 : val < 62 ? -4 : val < 63 ? -19 : -16);
  }

  for (let i = bLength; i < cps.length; i++) {
    cps[i] = 61; // "="
  }
  return String.fromCharCode(...cps);
}

export function decodeUTF8(bytes: Uint8Array): string {
  try {
    // Caveat: this function silently substitutes stray surrogates with U+FFFD.
    return decodeURIComponent(
      Array.from(bytes).map((b) => `%${b.toString(16)}`).join(""),
    );
  } catch (_e) {
    throw new Error("Invalid UTF-8 sequence");
  }
}

type WireState = {
  /** buffer */
  readonly b: Uint8Array;
  /** position */
  p: number;
};

function readByte(state: WireState): number {
  if (state.p >= state.b.length) throw new Error("Unexpected EOF");
  return state.b[state.p++];
}

function readVarint(state: WireState): bigint {
  let result = 0n;
  let shift = 0n;
  while (true) {
    const current = readByte(state);
    result |= BigInt(current & 127) << shift;
    if (current < 128) break;
    shift += 7n;
  }
  return result;
}

function readLE(state: WireState, bytelen: number): bigint {
  let value = 0n;
  for (let i = 0; i < bytelen; i++) {
    const byte = readByte(state);
    value |= BigInt(byte) << BigInt(i * 8);
  }
  return value;
}

export type WireField = IntegralWireField | BytesWireField | GroupWireField;
export type IntegralWireField = {
  /** field number */
  f: bigint;
  /** wire type */
  w: 0 | 1 | 5;
  /** value */
  v: bigint;
};
export type BytesWireField = {
  /** field number */
  f: bigint;
  /** wire type */
  w: 2;
  /** value */
  v: Uint8Array;
};
export type GroupWireField = {
  /** field number */
  f: bigint;
  /** wire type */
  w: 3;
  /** value */
  v: WireField[];
};

function readFields(state: WireState, endGroup?: bigint): WireField[] {
  const fields: WireField[] = [];
  while (true) {
    const field = readField(state, endGroup);
    if (field == null) break;
    fields.push(field);
  }
  return fields;
}

function readField(state: WireState, endGroup?: bigint): WireField | null {
  if (endGroup == null && state.p >= state.b.length) return null;

  const tag = readVarint(state);
  const wireType = Number(tag & 7n);
  const fieldNumber = tag >> 3n;
  switch (wireType) {
    // VARINT
    case 0: {
      const value = readVarint(state);
      return { f: fieldNumber, w: wireType, v: value };
    }
    // I64 / I32
    case 1:
    case 5: {
      const len = wireType === 1 ? 8 : 4;
      const value = readLE(state, len);
      return { f: fieldNumber, w: wireType, v: value };
    }
    // LEN
    case 2: {
      const length = Number(readVarint(state));
      if (state.p + length > state.b.length) throw new Error("Unexpected EOF");
      const value = state.b.subarray(state.p, state.p + length);
      state.p += length;
      return { f: fieldNumber, w: wireType, v: value };
    }
    // SGROUP
    case 3: {
      const fields = readFields(state, fieldNumber);
      return { f: fieldNumber, w: wireType, v: fields };
    }
    // EGROUP
    case 4: {
      if (fieldNumber === endGroup) return null;
      throw new Error("Invalid group");
    }
    default:
      throw new Error("Unexpected wire type");
  }
}

export function parseWire(input: Uint8Array): WireField[] {
  const state = { b: input, p: 0 };
  return readFields(state);
}

function inferScalarType(field: IntegralWireField): string {
  const { w: wireType, v: value } = field;

  // Infer floating point numbers
  if (wireType === 1) {
    const fabs = value & 0x7FFFFFFFFFFFFFFFn;
    if (
      // zero
      fabs === 0n ||
      // reasonable range of normalized numbers
      0x3000000000000000n <= fabs && fabs < 0x5000000000000000n ||
      // infinity
      fabs === 0x7FF0000000000000n ||
      // popular NaN representation
      fabs === 0x7FF8000000000000n
    ) {
      return "double";
    }
  }
  if (wireType === 5) {
    const fabs = value & 0x7FFFFFFFn;
    if (
      // zero
      fabs === 0n ||
      // reasonable range of normalized numbers
      0x30000000n <= fabs && fabs < 0x50000000n ||
      // infinity
      fabs === 0x7F800000n ||
      // popular NaN representation
      fabs === 0x7FC00000n
    ) {
      return "float";
    }
  }

  // Infer signed integers
  if (0xE0000000n <= value && value < 0x100000000n) {
    if (wireType === 0) return "int32";
    if (wireType === 5) return "sfixed32";
  }
  if (0xE000000000000000n <= value && value < 0x10000000000000000n) {
    if (wireType === 0) return "int64";
    if (wireType === 1) return "sfixed64";
  }

  // Fall back to unsigned integers
  if (wireType === 1) return "fixed64";
  if (wireType === 5) return "fixed32";
  return "uint64";

  // Not inferred:
  // - bool
  // - enum
  // - signed-succinct variants (sint32, sint64)
}

export type JSONValue =
  | null
  | boolean
  | number
  | string
  | JSONValue[]
  | { [key: string]: JSONValue };

export type Typedefs = {
  [key: `message ${string}`]: MessageDef;
  [key: `enum ${string}`]: EnumDef;
};
export type MessageDef = Record<string, FieldDef>;
export type FieldDef = {
  type: string;
  id: number;
  repeated?: boolean;
  fieldPresence?: "explicit" | "implicit";
  oneofGroup?: string;
};
export type EnumDef = {
  [key: string]: number;
};

export function parseBytes(
  input: Uint8Array,
  messageType: string,
  typedefs: Typedefs,
): JSONValue {
  return interpretWire(parseWire(input), messageType, typedefs);
}

function interpretWire(
  fields: WireField[],
  messageType: string,
  typedefs: Typedefs,
): JSONValue {
  const fieldsById: Record<string, WireField[]> = {};
  for (const field of fields) {
    (fieldsById[field.f as unknown as string] ??= []).push(field);
  }

  const result: Record<string, JSONValue> = {};

  const msgDesc = typedefs[`message ${messageType}`];
  if (msgDesc) {
    for (const [fieldName, fieldDesc] of Object.entries(msgDesc)) {
      const values = fieldsById[fieldDesc.id] ?? [];
      delete fieldsById[fieldDesc.id];

      const typeDesc = getType(fieldDesc.type, typedefs);
      const { fieldPresence = "explicit" } = fieldDesc;

      let interpretedValue: JSONValue;
      // let isZero: boolean;
      if (fieldDesc.repeated) {
        let unpackedValues = values;
        if (typeDesc < THRESHOLD_I64) {
          unpackedValues = [];
          for (const packedValue of values) {
            if (packedValue.w !== 2) {
              unpackedValues.push(packedValue);
              continue;
            }
            const state: WireState = { b: packedValue.v, p: 0 };
            while (state.p < packedValue.v.length) {
              if (typeDesc < THRESHOLD_VARINT) {
                unpackedValues.push({
                  f: BigInt(fieldDesc.id),
                  w: 0,
                  v: readVarint(state),
                });
              } else {
                unpackedValues.push({
                  f: BigInt(fieldDesc.id),
                  w: typeDesc < THRESHOLD_I32 ? 5 : 1,
                  v: readLE(state, typeDesc < THRESHOLD_I32 ? 4 : 8),
                });
              }
            }
          }
        }

        interpretedValue = unpackedValues.map((value) =>
          interpretOne(value, typeDesc, fieldDesc.type, typedefs)
        );
        // isZero = interpretedValue.length === 0;
      } else if (
        fieldPresence === "explicit" || fieldDesc.oneofGroup
      ) {
        interpretedValue = values.length > 0
          ? interpretOne(
            values[values.length - 1],
            typeDesc,
            fieldDesc.type,
            typedefs,
          )
          : null;
        // isZero = interpretedValue != null;
      } else {
        interpretedValue = values.length > 0
          ? interpretOne(
            values[values.length - 1],
            typeDesc,
            fieldDesc.type,
            typedefs,
          )
          : getZeroValue(typeDesc, fieldDesc.type, typedefs);
        // isZero = interpretedValue === ZERO_VALUES[typeDesc];
      }
      if (
        fieldPresence === "explicit" && !fieldDesc.oneofGroup &&
        (interpretedValue === null ||
          typeDesc === TYPE_ENUM &&
            interpretedValue ===
              getZeroValue(typeDesc, fieldDesc.type, typedefs))
      ) {
        continue;
      }
      result[fieldName] = interpretedValue;
    }
  }

  // Unknown fields
  for (const wireValues of Object.values(fieldsById)) {
    const f = wireValues[0].f;
    const repr = wireValues.map((field) => {
      let repr: JSONValue;
      if (field.w === 2) {
        repr = `unknown:bytes:${encodeBase64(field.v)}`;
      } else if (field.w === 3) {
        repr = interpretWire(field.v, messageType, typedefs);
      } else {
        const scalarType = inferScalarType(field);
        switch (scalarType) {
          case "double":
            repr = `unknown:double:${printNumber(reinterpretDouble(field.v))}`;
            break;
          case "float":
            repr = `unknown:float:${printNumber(reinterpretFloat(field.v))}`;
            break;
          case "int32":
          case "sfixed32":
            repr = `unknown:${scalarType}:${
              (field.v & 0xFFFFFFFFn) - ((field.v >> 31n) & 1n) * 0x100000000n
            }`;
            break;
          case "int64":
          case "sfixed64":
            repr = `unknown:${scalarType}:${
              (field.v & 0xFFFFFFFFFFFFFFFFn) -
              ((field.v >> 63n) & 1n) * 0x10000000000000000n
            }`;
            break;
          default:
            repr = `unknown:uint64:${field.v}`;
            break;
        }
      }
      return repr;
    });
    result[`#${f}`] = repr.length === 1 ? repr[0] : repr;
  }
  return result;
}

// |    |   0      |   1      |   2      |   3      |   4      |   5      |   6      |   7      |
// |----|----------|----------|----------|----------|----------|----------|----------|----------|
// |  0 | enum     | bool     |          |          |          |          |          |          |
// |  8 | uint32   | int32    |          | sint32   | uint64   | int64    |          | sint64   |
// | 16 | fixed32  | sfixed32 |          | float    | fixed64  | sfixed64 |          | double   |
// | 24 | message  | map      | bytes    | string   | group    |          |          |          |

// VARINT
const TYPE_ENUM = 0;
const TYPE_BOOL = 1;
const TYPE_UINT32 = 8;
const TYPE_INT32 = 9;
const TYPE_SINT32 = 11;
const TYPE_UINT64 = 12;
const TYPE_INT64 = 13;
const TYPE_SINT64 = 15;
// I32
const TYPE_FIXED32 = 16;
const TYPE_SFIXED32 = 17;
const TYPE_FLOAT = 19;
// I64
const TYPE_FIXED64 = 20;
const TYPE_SFIXED64 = 21;
const TYPE_DOUBLE = 23;
// LEN
const TYPE_MESSAGE = 24;
const TYPE_MAP = 25;
const TYPE_BYTES = 26;
const TYPE_STRING = 27;
// SGROUP
const TYPE_GROUP = 28;

const THRESHOLD_VARINT = 16;
const THRESHOLD_I32 = 20;
const THRESHOLD_I64 = 24;
const THRESHOLD_LEN = 28;

function isZigZagType(typeDesc: number): boolean {
  return (typeDesc & 3) === 3;
}

function isSigned(typeDesc: number): boolean {
  return (typeDesc & 1) === 1;
}

function is64BitType(typeDesc: number): boolean {
  return (typeDesc & 4) === 4;
}

function getZeroValue(
  typeDesc: number,
  typeName: string,
  typedefs: Typedefs,
): JSONValue {
  if (typeDesc === TYPE_ENUM) {
    // Presence is guaranteed through getType
    const enumDesc = typedefs[`enum ${typeName}`]!;
    return Object.entries(enumDesc)[0][0] ?? 0;
  }
  return ZERO_VALUES[typeDesc];
}

const ZERO_VALUES: Record<number, JSONValue> = {
  [TYPE_BOOL]: false,
  [TYPE_UINT32]: 0,
  [TYPE_INT32]: 0,
  [TYPE_SINT32]: 0,
  [TYPE_UINT64]: "0",
  [TYPE_INT64]: "0",
  [TYPE_SINT64]: "0",
  [TYPE_FIXED32]: 0,
  [TYPE_SFIXED32]: 0,
  [TYPE_FLOAT]: 0,
  [TYPE_FIXED64]: "0",
  [TYPE_SFIXED64]: "0",
  [TYPE_DOUBLE]: 0,
  [TYPE_MESSAGE]: null,
  [TYPE_BYTES]: "",
  [TYPE_STRING]: "",
};

const typeMap: Record<string, number> = {
  bool: TYPE_BOOL,
  uint32: TYPE_UINT32,
  int32: TYPE_INT32,
  sint32: TYPE_SINT32,
  uint64: TYPE_UINT64,
  int64: TYPE_INT64,
  sint64: TYPE_SINT64,
  fixed32: TYPE_FIXED32,
  sfixed32: TYPE_SFIXED32,
  float: TYPE_FLOAT,
  fixed64: TYPE_FIXED64,
  sfixed64: TYPE_SFIXED64,
  double: TYPE_DOUBLE,
  bytes: TYPE_BYTES,
  string: TYPE_STRING,
};
function getType(typeName: string, typedefs: Typedefs): number {
  if (typeName in typeMap) return typeMap[typeName];
  if (`message ${typeName}` in typedefs) return TYPE_MESSAGE;
  if (`enum ${typeName}` in typedefs) return TYPE_ENUM;
  throw new Error("TODO: map or group");
}
function interpretOne(
  fieldData: WireField,
  typeDesc: number,
  typeName: string,
  typedefs: Typedefs,
): JSONValue {
  if (typeDesc < THRESHOLD_I64) {
    const expectedWireType = typeDesc < THRESHOLD_VARINT
      ? 0
      : typeDesc < THRESHOLD_I32
      ? 5
      : 1;
    if (fieldData.w !== expectedWireType) {
      throw new Error(
        `Expected wire type ${expectedWireType}, got ${fieldData.w}`,
      );
    }
    if (typeDesc === TYPE_BOOL) {
      return !!fieldData.v;
    } else if (typeDesc === TYPE_ENUM) {
      // Presence is guaranteed through getType
      const enumDesc = typedefs[`enum ${typeName}`]!;
      for (const [enumName, enumId] of Object.entries(enumDesc)) {
        if (enumId === Number(fieldData.v)) return enumName;
      }
      // Fallback
      return Number(fieldData.v);
    } else if (typeDesc === TYPE_FLOAT) {
      return stringifySpecialFloat(reinterpretFloat(fieldData.v));
    } else if (typeDesc === TYPE_DOUBLE) {
      return stringifySpecialFloat(reinterpretDouble(fieldData.v));
    }
    const value = isZigZagType(typeDesc)
      ? (fieldData.v >> 1n) ^ -(fieldData.v & 1n)
      : isSigned(typeDesc)
      ? is64BitType(typeDesc)
        ? (fieldData.v & 0xFFFFFFFFFFFFFFFFn) -
          (((fieldData.v >> 63n) & 1n) << 64n)
        : (fieldData.v & 0xFFFFFFFFn) - (((fieldData.v >> 31n) & 1n) << 32n)
      : fieldData.v;
    if (is64BitType(typeDesc)) {
      return String(value);
    } else {
      return Number(value);
    }
  } else if (typeDesc < THRESHOLD_LEN) {
    if (fieldData.w !== 2) {
      throw new Error(
        `Expected wire type 2, got ${fieldData.w}`,
      );
    }
    if (typeDesc === TYPE_BYTES) {
      return encodeBase64(fieldData.v);
    } else if (typeDesc === TYPE_STRING) {
      return decodeUTF8(fieldData.v);
    } else if (typeDesc === TYPE_MAP) {
      throw new Error("TODO: map");
    } else {
      return parseBytes(fieldData.v, typeName, typedefs);
    }
  } else {
    throw new Error("TODO: wire type 3");
  }
}

function stringifySpecialFloat(
  value: number,
): number | "NaN" | "Infinity" | "-Infinity" {
  return 1 / value === 0 || value != value
    ? (`${value}` as "NaN" | "Infinity" | "-Infinity")
    : value;
}
function reinterpretDouble(value: bigint): number {
  return new Float64Array(BigUint64Array.of(value).buffer)[0];
}
function reinterpretFloat(value: bigint): number {
  return new Float32Array(Uint32Array.of(Number(value)).buffer)[0];
}
function printNumber(value: number): string {
  return value === 0 && 1 / value < 0 ? "-0" : `${value}`;
}

export function parse(
  input: string,
  messageType: string,
  typedefs: JSONValue,
): JSONValue {
  return parseBytes(decodeBase64(input), messageType, typedefs as Typedefs);
}
