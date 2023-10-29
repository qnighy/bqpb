import { assertEquals } from "https://deno.land/std@0.204.0/assert/mod.ts";
import { decodeBase64 } from "./bqpb.ts";

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
