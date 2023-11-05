export function b(
  template: TemplateStringsArray,
  ...substitutions: Uint8Array[]
): Uint8Array {
  const compiled = compileTemplate(template);
  const length = compiled.reduce((acc, bytes) => acc + bytes.length, 0) +
    substitutions.reduce((acc, bytes) => acc + bytes.length, 0);

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (let i = 0; i < template.length; i++) {
    bytes.set(compiled[i], offset);
    offset += compiled[i].length;
    if (i < substitutions.length) {
      bytes.set(substitutions[i], offset);
      offset += substitutions[i].length;
    }
  }
  return bytes;
}

const templateCache = new WeakMap<TemplateStringsArray, Uint8Array[]>();
function compileTemplate(template: TemplateStringsArray): Uint8Array[] {
  if (templateCache.has(template)) {
    return templateCache.get(template)!;
  }

  const compiled = template.map((str) => {
    if (str == null) {
      throw new Error("Invalid byte string template");
    }
    const charCodes = [...str].map((char) => char.charCodeAt(0));
    if (charCodes.some((cc) => cc >= 256)) {
      throw new Error("Invalid byte string template");
    }
    return Uint8Array.from(charCodes);
  });
  templateCache.set(template, compiled);
  return compiled;
}
