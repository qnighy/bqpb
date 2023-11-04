import { assertEquals } from "https://deno.land/std@0.204.0/assert/mod.ts";
import { decodeBase64, parseBytes, parseWire } from "./bqpb.ts";

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

Deno.test("parseBytes", async (t) => {
  await t.step("when no schema is provided", async (t) => {
    await t.step("parses empty bytes", () => {
      const actual = parseBytes(Uint8Array.from([]), "Main", {});
      assertEquals(actual, {});
    });
    await t.step("parses varint", () => {
      const actual = parseBytes(Uint8Array.from([8, 55]), "Main", {});
      assertEquals(actual, {
        "#1": "unknown:uint64:55",
      });
    });
    await t.step("parses multiple values", () => {
      const actual = parseBytes(Uint8Array.from([8, 55, 8, 60]), "Main", {});
      assertEquals(actual, {
        "#1": ["unknown:uint64:55", "unknown:uint64:60"],
      });
    });
    await t.step("infers int32", () => {
      const actual = parseBytes(
        Uint8Array.from([8, 255, 255, 255, 255, 15]),
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": "unknown:int32:-1",
      });
    });
    await t.step("infers int64", () => {
      const actual = parseBytes(
        Uint8Array.from([8, 255, 255, 255, 255, 255, 255, 255, 255, 255, 1]),
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": "unknown:int64:-1",
      });
    });
    await t.step("infers double", () => {
      const actual = parseBytes(
        Uint8Array.from([
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          128,
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          240,
          63,
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          240,
          191,
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          248,
          63,
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          248,
          191,
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          240,
          127,
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          240,
          255,
          9,
          0,
          0,
          0,
          0,
          0,
          0,
          248,
          127,
        ]),
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": [
          "unknown:double:0",
          "unknown:double:-0",
          "unknown:double:1",
          "unknown:double:-1",
          "unknown:double:1.5",
          "unknown:double:-1.5",
          "unknown:double:Infinity",
          "unknown:double:-Infinity",
          "unknown:double:NaN",
        ],
      });
    });
    await t.step("infers float", () => {
      const actual = parseBytes(
        Uint8Array.from([
          13,
          0,
          0,
          0,
          0,
          13,
          0,
          0,
          0,
          128,
          13,
          0,
          0,
          128,
          63,
          13,
          0,
          0,
          128,
          191,
          13,
          0,
          0,
          192,
          63,
          13,
          0,
          0,
          192,
          191,
          13,
          0,
          0,
          128,
          127,
          13,
          0,
          0,
          128,
          255,
          13,
          0,
          0,
          192,
          127,
        ]),
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": [
          "unknown:float:0",
          "unknown:float:-0",
          "unknown:float:1",
          "unknown:float:-1",
          "unknown:float:1.5",
          "unknown:float:-1.5",
          "unknown:float:Infinity",
          "unknown:float:-Infinity",
          "unknown:float:NaN",
        ],
      });
    });
    await t.step("infers sfixed64", () => {
      const actual = parseBytes(
        Uint8Array.from([
          9,
          246,
          255,
          255,
          255,
          255,
          255,
          255,
          255,
        ]),
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": "unknown:sfixed64:-10",
      });
    });
    await t.step("infers sfixed32", () => {
      const actual = parseBytes(
        Uint8Array.from([
          13,
          246,
          255,
          255,
          255,
        ]),
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": "unknown:sfixed32:-10",
      });
    });
  });
  await t.step("when schema is provided", async (t) => {
    await t.step("when the field is regular (non-optional)", async (t) => {
      await t.step("parses simple field", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            1,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: 1,
        });
      });
      await t.step("uses zero value", () => {
        const actual = parseBytes(Uint8Array.from([]), "Main", {
          "message Main": {
            myField: {
              type: "uint32",
              id: 1,
            },
          },
        });
        assertEquals(actual, {
          myField: 0,
        });
      });
      await t.step("picks the last one on duplicate", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            1,
            8,
            2,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: 2,
        });
      });
    });
    await t.step("when the field is optional", async (t) => {
      await t.step("parses simple field", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            1,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "optional",
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: 1,
        });
      });
      await t.step("returns null on missing field", () => {
        const actual = parseBytes(Uint8Array.from([]), "Main", {
          "message Main": {
            myField: {
              label: "optional",
              type: "uint32",
              id: 1,
            },
          },
        });
        assertEquals(actual, {
          myField: null,
        });
      });
      await t.step("picks the last one on duplicate", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            1,
            8,
            2,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "optional",
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: 2,
        });
      });
    });
    await t.step("when the field is repeated", async (t) => {
      await t.step("parses field of length 1", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            1,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [1],
        });
      });
      await t.step("returns empty array on missing field", () => {
        const actual = parseBytes(Uint8Array.from([]), "Main", {
          "message Main": {
            myField: {
              label: "repeated",
              type: "uint32",
              id: 1,
            },
          },
        });
        assertEquals(actual, {
          myField: [],
        });
      });
      await t.step("parses field of length 2", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            1,
            8,
            2,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [1, 2],
        });
      });
    });

    await t.step("parsing of VARINT datatypes", async (t) => {
      await t.step("parses bool", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            0,
            8,
            1,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "bool",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [false, true],
        });
      });
      await t.step("parses uint32", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            0,
            8,
            1,
            8,
            2,
            8,
            255,
            255,
            255,
            255,
            15,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [0, 1, 2, 4294967295],
        });
      });
      await t.step("parses int32", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            0,
            8,
            1,
            8,
            2,
            8,
            255,
            255,
            255,
            255,
            15,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "int32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [0, 1, 2, -1],
        });
      });
      await t.step("parses sint32", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            0,
            8,
            1,
            8,
            2,
            8,
            3,
            8,
            4,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "sint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [0, -1, 1, -2, 2],
        });
      });
      await t.step("parses uint64", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            0,
            8,
            1,
            8,
            2,
            8,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
            1,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "uint64",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: ["0", "1", "2", "18446744073709551615"],
        });
      });
      await t.step("parses int64", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            0,
            8,
            1,
            8,
            2,
            8,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
            1,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "int64",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: ["0", "1", "2", "-1"],
        });
      });
      await t.step("parses sint64", () => {
        const actual = parseBytes(
          Uint8Array.from([
            8,
            0,
            8,
            1,
            8,
            2,
            8,
            3,
            8,
            4,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "sint64",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: ["0", "-1", "1", "-2", "2"],
        });
      });
    });
    await t.step("parsing of I32 datatypes", async (t) => {
      await t.step("parses fixed32", () => {
        const actual = parseBytes(
          Uint8Array.from([
            13,
            0,
            0,
            0,
            0,
            13,
            1,
            0,
            0,
            0,
            13,
            2,
            0,
            0,
            0,
            13,
            255,
            255,
            255,
            255,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "fixed32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [0, 1, 2, 4294967295],
        });
      });
      await t.step("parses sfixed32", () => {
        const actual = parseBytes(
          Uint8Array.from([
            13,
            0,
            0,
            0,
            0,
            13,
            1,
            0,
            0,
            0,
            13,
            2,
            0,
            0,
            0,
            13,
            255,
            255,
            255,
            255,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "sfixed32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [0, 1, 2, -1],
        });
      });
      await t.step("parses float", () => {
        const actual = parseBytes(
          Uint8Array.from([
            13,
            0,
            0,
            0,
            0,
            13,
            0,
            0,
            0,
            128,
            13,
            0,
            0,
            128,
            63,
            13,
            0,
            0,
            128,
            191,
            13,
            0,
            0,
            192,
            63,
            13,
            0,
            0,
            192,
            191,
            13,
            0,
            0,
            128,
            127,
            13,
            0,
            0,
            128,
            255,
            13,
            0,
            0,
            192,
            127,
            13,
            0,
            0,
            192,
            255,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "float",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [
            0,
            -0,
            1,
            -1,
            1.5,
            -1.5,
            "Infinity",
            "-Infinity",
            "NaN",
            "NaN",
          ],
        });
      });
    });
    await t.step("parsing of I64 datatypes", async (t) => {
      await t.step("parses fixed64", () => {
        const actual = parseBytes(
          Uint8Array.from([
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            9,
            1,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            9,
            2,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            9,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "fixed64",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: ["0", "1", "2", "18446744073709551615"],
        });
      });
      await t.step("parses sfixed64", () => {
        const actual = parseBytes(
          Uint8Array.from([
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            9,
            1,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            9,
            2,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            9,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
            255,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "sfixed64",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: ["0", "1", "2", "-1"],
        });
      });
      await t.step("parses double", () => {
        const actual = parseBytes(
          Uint8Array.from([
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            128,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            240,
            63,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            240,
            191,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            248,
            63,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            248,
            191,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            240,
            127,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            240,
            255,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            248,
            127,
            9,
            0,
            0,
            0,
            0,
            0,
            0,
            248,
            255,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                label: "repeated",
                type: "double",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [
            0,
            -0,
            1,
            -1,
            1.5,
            -1.5,
            "Infinity",
            "-Infinity",
            "NaN",
            "NaN",
          ],
        });
      });
    });
  });
});
