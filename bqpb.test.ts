import { assertEquals } from "https://deno.land/std@0.204.0/assert/mod.ts";
import { decodeBase64, encodeBase64, parseBytes, parseWire } from "./bqpb.ts";
import { b } from "./utils/b.ts";

Deno.test("decodeBase64", async (t) => {
  const table: [string, Uint8Array][] = [
    ["", b``],
    ["QQ==", b`A`],
    ["QUJDREVGRw==", b`ABCDEFG`],
    [
      "Dal74UOj7Gj/iyPbDLcVfGmro1s=",
      b`\x0d\xa9\x7b\xe1\x43\xa3\xec\x68\xff\x8b\x23\xdb\x0c\xb7\x15\x7c\x69\xab\xa3\x5b`,
    ],
    [
      "97droGaOgNphfcLuxP3VbG5x+eE=",
      b`\xf7\xb7\x6b\xa0\x66\x8e\x80\xda\x61\x7d\xc2\xee\xc4\xfd\xd5\x6c\x6e\x71\xf9\xe1`,
    ],
    [
      "dy02wdI0Nhy5L1h4m7dS6E7+WoNa",
      b`\x77\x2d\x36\xc1\xd2\x34\x36\x1c\xb9\x2f\x58\x78\x9b\xb7\x52\xe8\x4e\xfe\x5a\x83\x5a`,
    ],
    [
      "2DA5Tl26oXOrZNZwLwKB+6JWv3xssQ==",
      b`\xd8\x30\x39\x4e\x5d\xba\xa1\x73\xab\x64\xd6\x70\x2f\x02\x81\xfb\xa2\x56\xbf\x7c\x6c\xb1`,
    ],
    [
      "zHJIpshLXB9ye+e1I4AZlgEsH70lNyg=",
      b`\xcc\x72\x48\xa6\xc8\x4b\x5c\x1f\x72\x7b\xe7\xb5\x23\x80\x19\x96\x01\x2c\x1f\xbd\x25\x37\x28`,
    ],
  ];
  for (const [input, expected] of table) {
    await t.step(`Decodes ${input} as [${expected}]`, () => {
      const actual = decodeBase64(input);
      assertEquals(actual, expected);
    });
  }
});

Deno.test("encodeBase64", async (t) => {
  const table: [string, Uint8Array][] = [
    ["", b``],
    ["QQ==", b`A`],
    ["QUJDREVGRw==", b`ABCDEFG`],
    [
      "Dal74UOj7Gj/iyPbDLcVfGmro1s=",
      b`\x0d\xa9\x7b\xe1\x43\xa3\xec\x68\xff\x8b\x23\xdb\x0c\xb7\x15\x7c\x69\xab\xa3\x5b`,
    ],
    [
      "97droGaOgNphfcLuxP3VbG5x+eE=",
      b`\xf7\xb7\x6b\xa0\x66\x8e\x80\xda\x61\x7d\xc2\xee\xc4\xfd\xd5\x6c\x6e\x71\xf9\xe1`,
    ],
    [
      "dy02wdI0Nhy5L1h4m7dS6E7+WoNa",
      b`\x77\x2d\x36\xc1\xd2\x34\x36\x1c\xb9\x2f\x58\x78\x9b\xb7\x52\xe8\x4e\xfe\x5a\x83\x5a`,
    ],
    [
      "2DA5Tl26oXOrZNZwLwKB+6JWv3xssQ==",
      b`\xd8\x30\x39\x4e\x5d\xba\xa1\x73\xab\x64\xd6\x70\x2f\x02\x81\xfb\xa2\x56\xbf\x7c\x6c\xb1`,
    ],
    [
      "zHJIpshLXB9ye+e1I4AZlgEsH70lNyg=",
      b`\xcc\x72\x48\xa6\xc8\x4b\x5c\x1f\x72\x7b\xe7\xb5\x23\x80\x19\x96\x01\x2c\x1f\xbd\x25\x37\x28`,
    ],
  ];
  for (const [expected, input] of table) {
    await t.step(`Encodes [${input}] as ${expected}`, () => {
      const actual = encodeBase64(input);
      assertEquals(actual, expected);
    });
  }
});

Deno.test("parseWire", async (t) => {
  await t.step("parses empty bytes", () => {
    const actual = parseWire(b``);
    assertEquals(actual, []);
  });
  await t.step("parses multiple fields", () => {
    const actual = parseWire(b`\x70\x32\x58\x36`);
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
    const actual = parseWire(b`\xf0\x23\xdd\x90\x07`);
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
      b`\x31\x11\x12\x13\x14\x15\x16\x17\x18`,
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
    const actual = parseWire(b`\x35\x11\x12\x13\x14`);
    assertEquals(actual, [
      {
        f: 6n,
        w: 5,
        v: 0x14131211n,
      },
    ]);
  });
  await t.step("parses LEN", () => {
    const actual = parseWire(b`\x42\x05\x01\x02\x03\x04\x05`);
    assertEquals(actual, [
      {
        f: 8n,
        w: 2,
        v: Uint8Array.from([1, 2, 3, 4, 5]),
      },
    ]);
  });
  await t.step("parses GROUP", () => {
    const actual = parseWire(b`\x4b\x70\x32\x58\x36\x4c`);
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
      const actual = parseBytes(b``, "Main", {});
      assertEquals(actual, {});
    });
    await t.step("parses varint", () => {
      const actual = parseBytes(b`\x08\x37`, "Main", {});
      assertEquals(actual, {
        "#1": "unknown:uint64:55",
      });
    });
    await t.step("parses multiple values", () => {
      const actual = parseBytes(b`\x08\x37\x08\x3c`, "Main", {});
      assertEquals(actual, {
        "#1": ["unknown:uint64:55", "unknown:uint64:60"],
      });
    });
    await t.step("infers int32", () => {
      const actual = parseBytes(b`\x08\xff\xff\xff\xff\x0f`, "Main", {});
      assertEquals(actual, {
        "#1": "unknown:int32:-1",
      });
    });
    await t.step("infers int64", () => {
      const actual = parseBytes(
        b`\x08\xff\xff\xff\xff\xff\xff\xff\xff\xff\x01`,
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
          ...b`\x09\x00\x00\x00\x00\x00\x00\x00\x00`,
          ...b`\x09\x00\x00\x00\x00\x00\x00\x00\x80`,
          ...b`\x09\x00\x00\x00\x00\x00\x00\xf0\x3f`,
          ...b`\x09\x00\x00\x00\x00\x00\x00\xf0\xbf`,
          ...b`\x09\x00\x00\x00\x00\x00\x00\xf8\x3f`,
          ...b`\x09\x00\x00\x00\x00\x00\x00\xf8\xbf`,
          ...b`\x09\x00\x00\x00\x00\x00\x00\xf0\x7f`,
          ...b`\x09\x00\x00\x00\x00\x00\x00\xf0\xff`,
          ...b`\x09\x00\x00\x00\x00\x00\x00\xf8\x7f`,
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
          ...b`\x0d\x00\x00\x00\x00`,
          ...b`\x0d\x00\x00\x00\x80`,
          ...b`\x0d\x00\x00\x80\x3f`,
          ...b`\x0d\x00\x00\x80\xbf`,
          ...b`\x0d\x00\x00\xc0\x3f`,
          ...b`\x0d\x00\x00\xc0\xbf`,
          ...b`\x0d\x00\x00\x80\x7f`,
          ...b`\x0d\x00\x00\x80\xff`,
          ...b`\x0d\x00\x00\xc0\x7f`,
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
        b`\x09\xf6\xff\xff\xff\xff\xff\xff\xff`,
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": "unknown:sfixed64:-10",
      });
    });
    await t.step("infers sfixed32", () => {
      const actual = parseBytes(
        b`\x0d\xf6\xff\xff\xff`,
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": "unknown:sfixed32:-10",
      });
    });
    await t.step("parses length-delimited", () => {
      const actual = parseBytes(
        b`\x0a\x03\x0a\x0b\x0c`,
        "Main",
        {},
      );
      assertEquals(actual, {
        "#1": "unknown:bytes:CgsM",
      });
    });
  });
  await t.step("when schema is provided", async (t) => {
    await t.step("when the field is regular (non-optional)", async (t) => {
      await t.step("parses simple field", () => {
        const actual = parseBytes(
          b`\x08\x01`,
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
        const actual = parseBytes(b``, "Main", {
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
          b`\x08\x01\x08\x02`,
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
          b`\x08\x01`,
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
      await t.step("returns empty on missing field", () => {
        const actual = parseBytes(b``, "Main", {
          "message Main": {
            myField: {
              label: "optional",
              type: "uint32",
              id: 1,
            },
          },
        });
        assertEquals(actual, {});
      });
      await t.step("picks the last one on duplicate", () => {
        const actual = parseBytes(
          b`\x08\x01\x08\x02`,
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
          b`\x08\x01`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
        const actual = parseBytes(b``, "Main", {
          "message Main": {
            myField: {
              repeated: true,
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
          b`\x08\x01\x08\x02`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
      await t.step("parses enum", () => {
        const actual = parseBytes(
          b`\x08\x00\x08\x01\x08\x02\x08\x03`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
                type: "MyEnum",
                id: 1,
              },
            },
            "enum MyEnum": {
              MY_ENUM_UNSPECIFIED: 0,
              MY_ENUM_VALUE_1: 1,
              MY_ENUM_VALUE_2: 2,
            },
          },
        );
        assertEquals(actual, {
          myField: [
            "MY_ENUM_UNSPECIFIED",
            "MY_ENUM_VALUE_1",
            "MY_ENUM_VALUE_2",
            3,
          ],
        });
      });
      await t.step("parses required enum with default value", () => {
        const actual = parseBytes(
          b``,
          "Main",
          {
            "message Main": {
              myField: {
                type: "MyEnum",
                id: 1,
              },
            },
            "enum MyEnum": {
              MY_ENUM_UNSPECIFIED: 0,
              MY_ENUM_VALUE_1: 1,
              MY_ENUM_VALUE_2: 2,
            },
          },
        );
        assertEquals(actual, {
          myField: "MY_ENUM_UNSPECIFIED",
        });
      });
      await t.step("parses optional enum with default value", () => {
        const actual = parseBytes(
          b``,
          "Main",
          {
            "message Main": {
              myField: {
                label: "optional",
                type: "MyEnum",
                id: 1,
              },
            },
            "enum MyEnum": {
              MY_ENUM_UNSPECIFIED: 0,
              MY_ENUM_VALUE_1: 1,
              MY_ENUM_VALUE_2: 2,
            },
          },
        );
        assertEquals(actual, {});
      });
      await t.step("parses bool", () => {
        const actual = parseBytes(
          b`\x08\x00\x08\x01`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
          b`\x08\x00\x08\x01\x08\x02\x08\xff\xff\xff\xff\x0f`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
          b`\x08\x00\x08\x01\x08\x02\x08\xff\xff\xff\xff\x0f`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
          b`\x08\x00\x08\x01\x08\x02\x08\x03\x08\x04`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
          b`\x08\x00\x08\x01\x08\x02\x08\xff\xff\xff\xff\xff\xff\xff\xff\xff\x01`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
          b`\x08\x00\x08\x01\x08\x02\x08\xff\xff\xff\xff\xff\xff\xff\xff\xff\x01`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
          b`\x08\x00\x08\x01\x08\x02\x08\x03\x08\x04`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
            ...b`\x0d\x00\x00\x00\x00`,
            ...b`\x0d\x01\x00\x00\x00`,
            ...b`\x0d\x02\x00\x00\x00`,
            ...b`\x0d\xff\xff\xff\xff`,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
            ...b`\x0d\x00\x00\x00\x00`,
            ...b`\x0d\x01\x00\x00\x00`,
            ...b`\x0d\x02\x00\x00\x00`,
            ...b`\x0d\xff\xff\xff\xff`,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
            ...b`\x0d\x00\x00\x00\x00`,
            ...b`\x0d\x00\x00\x00\x80`,
            ...b`\x0d\x00\x00\x80\x3f`,
            ...b`\x0d\x00\x00\x80\xbf`,
            ...b`\x0d\x00\x00\xc0\x3f`,
            ...b`\x0d\x00\x00\xc0\xbf`,
            ...b`\x0d\x00\x00\x80\x7f`,
            ...b`\x0d\x00\x00\x80\xff`,
            ...b`\x0d\x00\x00\xc0\x7f`,
            ...b`\x0d\x00\x00\xc0\xff`,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
            ...b`\x09\x00\x00\x00\x00\x00\x00\x00\x00`,
            ...b`\x09\x01\x00\x00\x00\x00\x00\x00\x00`,
            ...b`\x09\x02\x00\x00\x00\x00\x00\x00\x00`,
            ...b`\x09\xff\xff\xff\xff\xff\xff\xff\xff`,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
            ...b`\x09\x00\x00\x00\x00\x00\x00\x00\x00`,
            ...b`\x09\x01\x00\x00\x00\x00\x00\x00\x00`,
            ...b`\x09\x02\x00\x00\x00\x00\x00\x00\x00`,
            ...b`\x09\xff\xff\xff\xff\xff\xff\xff\xff`,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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
            ...b`\x09\x00\x00\x00\x00\x00\x00\x00\x00`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\x00\x80`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\xf0\x3f`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\xf0\xbf`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\xf8\x3f`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\xf8\xbf`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\xf0\x7f`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\xf0\xff`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\xf8\x7f`,
            ...b`\x09\x00\x00\x00\x00\x00\x00\xf8\xff`,
          ]),
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
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

    await t.step("parsing of LEN datatypes", async (t) => {
      await t.step("parses bytes", () => {
        const actual = parseBytes(
          b`\x0a\x00\x0a\x06\x00\x01\x02\x80\x81\x82`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
                type: "bytes",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: ["", "AAECgIGC"],
        });
      });
      await t.step("parses string", () => {
        const actual = parseBytes(
          b`\x0a\x00\x0a\x06\x61\x62\x63\xe3\x81\x82`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
                type: "string",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: ["", "abcあ"],
        });
      });
      await t.step("parses submessage", () => {
        const actual = parseBytes(
          b`\x0a\x02\x08\x2a`,
          "Main",
          {
            "message Main": {
              myField: {
                repeated: true,
                type: "Sub",
                id: 1,
              },
            },
            "message Sub": {
              submessageField: {
                repeated: true,
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: [{
            submessageField: [42],
          }],
        });
      });
      await t.step("parses required submessage with default value", () => {
        const actual = parseBytes(
          b``,
          "Main",
          {
            "message Main": {
              myField: {
                type: "Sub",
                id: 1,
              },
            },
            "message Sub": {
              submessageField: {
                repeated: true,
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {
          myField: null,
        });
      });
      await t.step("parses optional submessage with default value", () => {
        const actual = parseBytes(
          b``,
          "Main",
          {
            "message Main": {
              myField: {
                label: "optional",
                type: "Sub",
                id: 1,
              },
            },
            "message Sub": {
              submessageField: {
                repeated: true,
                type: "uint32",
                id: 1,
              },
            },
          },
        );
        assertEquals(actual, {});
      });
    });
  });
});
