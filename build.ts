// @deno-types="@types/babel__traverse"
import { Visitor } from "@babel/traverse";
// @deno-types="@types/babel__core"
import babel, { PluginObj } from "@babel/core";
import babelPluginTypeScript from "@babel/plugin-transform-typescript";
import { minify } from "terser";

type Babel = typeof babel;

const version = (await Deno.readTextFile("version.txt")).trim();
const origSource = await Deno.readTextFile("bqpb.ts");

const babelResult = await babel.transformAsync(origSource, {
  configFile: false,
  babelrc: false,
  highlightCode: false,
  plugins: [
    babelPluginTypeScript,
    [functionalizePlugin, {
      exportName: "parse",
      args: ["input", "messageType", "typedefs"],
    }],
  ],
});

if (!babelResult?.code) {
  throw new Error("nothing returned from Babel");
}

const minifyResult = await minify(babelResult.code, {
  parse: {
    bare_returns: true,
  },
  compress: {
    ecma: 2020,
    keep_fargs: false,
    unsafe_arrows: true,
    unsafe_comps: true,
    unsafe_math: true,
    unsafe_methods: true,
    unsafe_proto: true,
    unsafe_undefined: true,
  },
  mangle: {
    toplevel: true,
  },
  format: {
    max_line_len: 79,
  },
});

const sql = `\
CREATE TEMP FUNCTION parseProtobuf(input BYTES, messageType STRING, typedefs JSON)
RETURNS JSON DETERMINISTIC
LANGUAGE js
AS r"""
// bqpb v${version}
// (c) 2023, Masaki Hara. Licensed under the MIT License.
${minifyResult.code}
""";
`;
await Deno.writeTextFile("./dist/bqpb.sql", sql);
const readme = await Deno.readTextFile("README.md");
await Deno.writeTextFile("README.md", updateEmbeddedSQL(readme, sql));

type FunctionalizeOptions = {
  exportName: string;
  args: string[];
};
function functionalizePlugin(
  babel: Babel,
  options: FunctionalizeOptions,
): PluginObj {
  const { exportName, args } = options;
  return {
    name: "functionalize",
    visitor: {
      Program(path) {
        let localName: string | undefined = undefined;
        for (const stmt of path.get("body")) {
          if (stmt.isExportNamedDeclaration()) {
            if (stmt.node.declaration) {
              if (declNames(stmt.node.declaration).includes(exportName)) {
                localName = exportName;
              }
              stmt.replaceWith(stmt.node.declaration);
            } else {
              for (const specifier of stmt.node.specifiers) {
                if (
                  specifier.type === "ExportSpecifier" &&
                  getExportName(specifier.exported) === exportName
                ) {
                  localName = specifier.local.name;
                }
              }
              stmt.remove();
            }
          } else if (stmt.isExportDefaultDeclaration()) {
            const defaultLocalName = stmt.scope.generateUidIdentifier(
              "default",
            );
            if (exportName === "default") {
              localName = defaultLocalName.name;
            }
            if (
              stmt.node.declaration.type === "ClassDeclaration" ||
              stmt.node.declaration.type === "FunctionDeclaration"
            ) {
              stmt.node.declaration.id = defaultLocalName;
              stmt.replaceWith(stmt.node.declaration);
            } else if (babel.types.isExpression(stmt.node.declaration)) {
              stmt.replaceWith(
                babel.types.variableDeclaration("const", [
                  babel.types.variableDeclarator(
                    defaultLocalName,
                    stmt.node.declaration,
                  ),
                ]),
              );
            } else {
              stmt.remove();
            }
          }
        }
        path.unshiftContainer(
          "directives",
          babel.types.directive(babel.types.directiveLiteral("use strict")),
        );
        path.node.sourceType = "script";
        if (!localName) {
          throw new Error(`Could not find export ${exportName}`);
        }
        path.pushContainer(
          "body",
          babel.types.returnStatement(
            babel.types.callExpression(
              babel.types.identifier(localName),
              args.map((arg) => babel.types.identifier(arg)),
            ),
          ),
        );
      },
    } satisfies Visitor,
  };
}

function declNames(decl: babel.types.Declaration) {
  switch (decl.type) {
    case "FunctionDeclaration":
    case "ClassDeclaration":
      return decl.id ? [decl.id.name] : [];
    case "VariableDeclaration":
      return decl.declarations.flatMap((decl) => lvalNames(decl.id));
    default:
      return [];
  }
}
function lvalNames(lval: babel.types.LVal | babel.types.Expression): string[] {
  switch (lval.type) {
    case "Identifier":
      return [lval.name];
    case "ObjectPattern":
      return lval.properties.flatMap((prop) =>
        prop.type === "RestElement" ? [] : lvalNames(prop.value)
      );
    case "ArrayPattern":
      return lval.elements.flatMap((elem) => elem ? lvalNames(elem) : []);
    case "RestElement":
      return lvalNames(lval.argument);
    case "AssignmentPattern":
      return lvalNames(lval.left);
    default:
      return [];
  }
}
function getExportName(
  node: babel.types.Identifier | babel.types.StringLiteral,
): string {
  return node.type === "StringLiteral" ? node.value : node.name;
}

function updateEmbeddedSQL(inputText: string, newSQL: string): string {
  let outputText = "";
  let inEmbeddedSQL = false;
  for (const line of inputText.split(/^/m)) {
    if (!inEmbeddedSQL) {
      if (line.startsWith("CREATE TEMP FUNCTION parseProtobuf")) {
        inEmbeddedSQL = true;
        outputText += newSQL;
      } else {
        outputText += line;
      }
    } else {
      if (line.startsWith('"""')) {
        inEmbeddedSQL = false;
      }
    }
  }
  return outputText;
}
