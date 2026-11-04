import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

const mobile = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, mobile), "utf8");
const files = (directory: string): string[] => readdirSync(new URL(directory, mobile), { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);

// Source-contract checks, not a Swift compiler. Keep the explicit array type:
// Capacitor's Obj-C method initializer has unspecified nullability, so inferred
// array elements can be optional and fail CAPBridgedPlugin conformance.
const nativeFiles = files("ios-resources").filter(path => /\.(swift|m|mm|h)$/.test(path));
// Inventory repository-owned native files as well as the canonical source tree.
// Generated ios/, dependencies and exported web assets are excluded by Git ignores.
const ownedNative = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.swift', '*.m', '*.mm', '*.h'],
  { cwd: new URL('../../', import.meta.url), encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).sort();
const plugins = nativeFiles.flatMap(file => {
  const source = read(file);
  const classes = [...source.matchAll(/(?:public\s+)?class\s+(\w+)\s*:\s*([^\{]+)\{/g)];
  return classes.filter(match => /\bCAPPlugin\b/.test(match[2])).map(match => {
    const nextClass = classes.find(candidate => candidate.index! > match.index!);
    const body = source.slice(match.index, nextClass?.index);
    return {
      file, source, body, className: match[1], protocols: match[2],
      identifier: body.match(/public let identifier(?:\s*:\s*String)?\s*=\s*"(\w+)"/)?.[1],
      jsName: body.match(/public let jsName(?:\s*:\s*String)?\s*=\s*"(\w+)"/)?.[1],
      methods: [...body.matchAll(/CAPPluginMethod\(name:\s*"(\w+)",\s*returnType:\s*(\w+)\)/g)]
        .map(method => ({ name: method[1], returnType: method[2] })),
    };
  });
});

const registrations = files("src").filter(path => /\.tsx?$/.test(path)).flatMap(file => {
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  const found: { file: string; name: string; methods: string[] }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "registerPlugin") {
      const name = node.arguments[0];
      expect(name && ts.isStringLiteral(name), `${file}: literal registerPlugin name required`).toBe(true);
      const type = node.typeArguments?.[0];
      const declaration = type && ts.isTypeLiteralNode(type) ? type : ast.statements.find(statement =>
        ts.isInterfaceDeclaration(statement) && statement.name.text === type?.getText(ast));
      if (!declaration || !(ts.isInterfaceDeclaration(declaration) || ts.isTypeLiteralNode(declaration))) {
        throw new Error(`${file}: declare the registerPlugin API in this file for contract inspection`);
      }
      const methods = declaration.members.filter(member => member.name?.getText(ast) !== "addListener").map(member => {
        if (!ts.isMethodSignature(member)) throw new Error(`${file}: expected a plugin API method`);
        expect(member.type?.getText(ast), `${file}: promise method`).toMatch(/^Promise</);
        return member.name.getText(ast);
      });
      found.push({ file, name: (name as ts.StringLiteral).text, methods });
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return found;
});

it("inventories every custom native plugin and matches both sides of the bridge", () => {
  expect(nativeFiles).toHaveLength(1);
  expect(ownedNative).toEqual(nativeFiles.map(file => `mobile/${file}`).sort());
  expect(plugins.map(plugin => plugin.className).sort()).toEqual(["NativeDocumentsPlugin", "NativeSpeechPlugin", "NativeVaultPlugin"]);
  expect(new Set(plugins.map(plugin => plugin.identifier)).size).toBe(plugins.length);
  expect(new Set(plugins.map(plugin => plugin.jsName)).size).toBe(plugins.length);
  expect(registrations.map(registration => registration.name).sort()).toEqual(plugins.map(plugin => plugin.jsName).sort());
  const controllerSource = read("ios-resources/NativeVault.swift");
  const controller = controllerSource.match(/override func capacitorDidLoad\(\)\s*\{([^}]+)\}/)?.[1] ?? "";
  expect(controller).not.toBe("");
  for (const plugin of plugins) {
    expect(plugin.protocols).toMatch(/\bCAPBridgedPlugin\b/);
    expect(plugin.identifier).toBe(plugin.className);
    expect(plugin.source).toContain(`@objc(${plugin.className})`);
    expect(controller).toContain(`bridge?.registerPluginInstance(${plugin.className}())`);
    const registration = registrations.find(item => item.name === plugin.jsName)!;
    expect(plugin.methods.map(method => method.name).sort()).toEqual([...registration.methods].sort());
    expect(new Set(plugin.methods.map(method => method.name)).size).toBe(plugin.methods.length);
    for (const method of plugin.methods) {
      expect(method.returnType).toBe("CAPPluginReturnPromise");
      expect(plugin.body).toMatch(new RegExp(`@objc\\s+(?:public\\s+)?func ${method.name}\\(_ call: CAPPluginCall\\)`));
    }
  }
  // Swift implements the bridge metadata; a CAP_PLUGIN category would duplicate it.
  for (const file of nativeFiles) expect(read(file)).not.toMatch(/\bCAP_PLUGIN(?:_METHOD|_CONFIG)?\s*\(/);
  console.info("Custom native plugin inventory:", JSON.stringify(plugins.map(({ file, className, identifier, jsName, methods }) =>
    ({ file, className, identifier, jsName, methods })), null, 2));
});

for (const plugin of plugins) {
  it(`${plugin.className} declares nonoptional CAPBridgedPlugin method metadata`, () => {
    expect(plugin.body).toMatch(/public let pluginMethods\s*:\s*\[CAPPluginMethod\]\s*=\s*\[/);
  });
}

it("pins RevenueCat and both native dependency manifests to the CM5 compatible release", () => {
  const name = "@revenuecat/purchases-capacitor";
  expect(JSON.parse(read("package.json")).dependencies[name]).toBe("13.8.0");
  const lock = JSON.parse(read("package-lock.json"));
  expect(lock.packages[""].dependencies[name]).toBe("13.8.0");
  expect(lock.packages[`node_modules/${name}`].version).toBe("13.8.0");
  expect(JSON.parse(read(`node_modules/${name}/package.json`)).version).toBe("13.8.0");
  expect(read(`node_modules/${name}/Package.swift`)).toContain('exact: "19.17.0"');
  expect(read(`node_modules/${name}/RevenuecatPurchasesCapacitor.podspec`))
    .toContain("s.dependency 'PurchasesHybridCommon', '19.17.0'");
});
