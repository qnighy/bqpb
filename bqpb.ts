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

// @ts-expect-error TODO
export function parse(base64Input: string): object {
}
