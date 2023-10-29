import { assertEquals } from "https://deno.land/std@0.204.0/assert/mod.ts";
import { decodeBase64, parseWire } from "./bqpb.ts";

Deno.test("decodeBase64", async (t) => {
  const table: [string, number[]][] = [
    ["", []],
    ["QQ==", [65]],
    ["QUJDREVGRw==", [65, 66, 67, 68, 69, 70, 71]],
    [
      "Dal74UOj7Gj/iyPbDLcVfGmro1s=",
      // deno-fmt-ignore
      [13, 169, 123, 225, 67, 163, 236, 104, 255, 139, 35, 219, 12, 183, 21, 124, 105, 171, 163, 91],
    ],
    [
      "97droGaOgNphfcLuxP3VbG5x+eE=",
      // deno-fmt-ignore
      [247, 183, 107, 160, 102, 142, 128, 218, 97, 125, 194, 238, 196, 253, 213, 108, 110, 113, 249, 225],
    ],
    [
      "dy02wdI0Nhy5L1h4m7dS6E7+WoNa",
      // deno-fmt-ignore
      [119, 45, 54, 193, 210, 52, 54, 28, 185, 47, 88, 120, 155, 183, 82, 232, 78, 254, 90, 131, 90],
    ],
    [
      "2DA5Tl26oXOrZNZwLwKB+6JWv3xssQ==",
      // deno-fmt-ignore
      [216, 48, 57, 78, 93, 186, 161, 115, 171, 100, 214, 112, 47, 2, 129, 251, 162, 86, 191, 124, 108, 177],
    ],
    [
      "zHJIpshLXB9ye+e1I4AZlgEsH70lNyg=",
      // deno-fmt-ignore
      [204, 114, 72, 166, 200, 75, 92, 31, 114, 123, 231, 181, 35, 128, 25, 150, 1, 44, 31, 189, 37, 55, 40],
    ],
  ];
  for (const [input, expected] of table) {
    await t.step(`Decodes ${input} as [${expected}]`, () => {
      const actual = decodeBase64(input);
      assertEquals(actual, Uint8Array.from(expected));
    });
  }
});

Deno.test("parseWire", async (t) => {
  await t.step("parses empty bytes", () => {
    const actual = parseWire(Uint8Array.from([]));
    assertEquals(actual, []);
  });
  await t.step("parses multiple fields", () => {
    const actual = parseWire(Uint8Array.from([112, 50, 88, 54]));
    assertEquals(actual, [
      {
        f: 14n,
        w: 0,
        v: 50n,
      },
      {
        f: 11n,
        w: 0,
        v: 54n,
      },
    ]);
  });
  await t.step("parses VARINT", () => {
    const actual = parseWire(Uint8Array.from([240, 35, 221, 144, 7]));
    assertEquals(actual, [
      {
        f: 574n,
        w: 0,
        v: 116829n,
      },
    ]);
  });
  await t.step("parses I64", () => {
    const actual = parseWire(
      Uint8Array.from([49, 17, 18, 19, 20, 21, 22, 23, 24]),
    );
    assertEquals(actual, [
      {
        f: 6n,
        w: 1,
        v: 0x1817161514131211n,
      },
    ]);
  });
  await t.step("parses I32", () => {
    const actual = parseWire(Uint8Array.from([53, 17, 18, 19, 20]));
    assertEquals(actual, [
      {
        f: 6n,
        w: 5,
        v: 0x14131211n,
      },
    ]);
  });
  await t.step("parses LEN", () => {
    const actual = parseWire(Uint8Array.from([66, 5, 1, 2, 3, 4, 5]));
    assertEquals(actual, [
      {
        f: 8n,
        w: 2,
        v: Uint8Array.from([1, 2, 3, 4, 5]),
      },
    ]);
  });
  await t.step("parses GROUP", () => {
    const actual = parseWire(Uint8Array.from([75, 112, 50, 88, 54, 76]));
    assertEquals(actual, [
      {
        f: 9n,
        w: 3,
        v: [
          {
            f: 14n,
            w: 0,
            v: 50n,
          },
          {
            f: 11n,
            w: 0,
            v: 54n,
          },
        ],
      },
    ]);
  });
});
