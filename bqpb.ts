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
    // | 0  1  2  3  4  5  6  7| [j = 0, >> 4]
    //                         | 8  9 10 11 12 13 14 15| [j = 1, << 4]
    //
    // i = 2:
    //             |12 13 14 15 16 17| [i = 2]
    // | 8  9 10 11 12 13 14 15| [j = 2, >> 2]
    //                         |16 17 18 19 20 21 22 23| [j = 3, << 6]
    //
    // i = 3:
    //       |18 19 20 21 22 23| [i = 3]
    // |16 17 18 19 20 21 22 23| [j = 3, >> 0]
    //
    // OOB read will be undefined and OOB write will be ignored.
    // bits overflowed beyond MSB are truncated as if (x & 255) was applied.
    const val2 = val << (2 + i % 4 * 2);
    arr[j - 1] |= val2 >> 8;
    arr[j] |= val2;
  }
  return arr;
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
      let value = 0n;
      for (let i = 0; i < len; i++) {
        const byte = readByte(state);
        value |= BigInt(byte) << BigInt(i * 8);
      }
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
    if (wireType === 5) return "fixed32";
  }
  if (0xE000000000000000n <= value && value < 0x10000000000000000n) {
    if (wireType === 0) return "int64";
    if (wireType === 1) return "fixed64";
  }

  // Fall back to unsigned integers
  if (wireType === 1) return "fixed64";
  if (wireType === 5) return "fixed32";
  return "uint64";

  // Not inferred:
  // - bool
  // - enum
  // - signed-succinct variants (sint32, sint64, sfixed32, sfixed64)
}

export function parseBytes(input: Uint8Array): object {
  throw new Error("TODO");
}

export function parse(input: string): object {
  return parseBytes(decodeBase64(input));
}
