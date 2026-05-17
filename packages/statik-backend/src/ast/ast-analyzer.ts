/**
 * AST-based analyzer.
 *
 * Parses each source file with @babel/parser (supporting JSX + TypeScript)
 * and extracts everything downstream stages need — rules use some of
 * the facts, the classifier uses others.
 *
 * Files that fail to parse are returned with parseError=true so rules
 * and the classifier can downgrade their confidence. We never throw
 * on a single file.
 */

import * as path from "path";
import { parse, ParserOptions } from "@babel/parser";
import traverseDefault from "@babel/traverse";
import { AstFacts, HookViolation, ScannedFile } from "../types";

// CJS/ESM interop: traverse may come back wrapped under `.default`.
const traverse =
  (traverseDefault as unknown as { default?: typeof traverseDefault }).default ??
  traverseDefault;

const PARSER_OPTIONS: ParserOptions = {
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  errorRecovery: true,
  plugins: [
    "jsx",
    "typescript",
    "decorators-legacy",
    "classProperties",
    "classPrivateProperties",
    "classPrivateMethods",
    "dynamicImport",
    "optionalChaining",
    "nullishCoalescingOperator",
    "exportDefaultFrom",
    "exportNamespaceFrom",
    "topLevelAwait",
  ],
};

const DIRECT_NETWORK_CALLEES = new Set(["fetch", "axios", "request"]);

const NETWORK_PACKAGES = new Set([
  "axios",
  "ky",
  "superagent",
  "got",
  "node-fetch",
  "undici",
]);

// React Native platform / device APIs we treat as architectural smells
// when accessed directly from UI files. Hooks and services are allowed
// to use them — they're the abstraction layer.
const NATIVE_API_RN_NAMES = new Set([
  "AsyncStorage", // historically exported from RN; still imported as named in old code
  "Platform",
  "NativeModules",
  "Linking",
  "PermissionsAndroid",
  "BackHandler",
  "Dimensions",
  "AppState",
]);

// Standalone packages whose default export should be treated as a native API.
const NATIVE_API_PACKAGES = new Map<string, string>([
  ["@react-native-async-storage/async-storage", "AsyncStorage"],
  ["@react-native-community/async-storage", "AsyncStorage"],
  ["@react-native-community/netinfo", "NetInfo"],
]);

// Anything matching this is treated as a React hook call site.
const HOOK_NAME_RE = /^use[A-Z]/;
// React component functions are PascalCase by convention.
const COMPONENT_NAME_RE = /^[A-Z]/;

/**
 * Best-effort lookup of an enclosing function's name. Handles the four
 * common shapes:
 *   - function Foo() {}                       (FunctionDeclaration.id)
 *   - const Foo = () => {}                    (VariableDeclarator.id)
 *   - Foo = () => {}                          (AssignmentExpression.left)
 *   - { foo: () => {} }                       (Property/ObjectProperty.key)
 * Returns null for anonymous IIFEs, callbacks, etc.
 */
function getEnclosingFunctionName(funcPath: any): string | null {
  if (!funcPath) return null;
  const node = funcPath.node;
  if (node.id?.type === "Identifier") return node.id.name;
  const parent = funcPath.parent;
  if (!parent) return null;
  if (parent.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
    return parent.id.name;
  }
  if (parent.type === "AssignmentExpression" && parent.left?.type === "Identifier") {
    return parent.left.name;
  }
  if (
    (parent.type === "Property" || parent.type === "ObjectProperty") &&
    parent.key?.type === "Identifier"
  ) {
    return parent.key.name;
  }
  return null;
}

function isComponentOrHook(name: string | null): boolean {
  if (!name) return false;
  return HOOK_NAME_RE.test(name) || COMPONENT_NAME_RE.test(name);
}

const NAVIGATOR_FACTORY_NAMES = new Set([
  "createStackNavigator",
  "createNativeStackNavigator",
  "createBottomTabNavigator",
  "createMaterialTopTabNavigator",
  "createMaterialBottomTabNavigator",
  "createDrawerNavigator",
]);

interface CalleeInfo {
  calleeText: string;
  rootName: string | null;
}

function describeCallee(node: any): CalleeInfo {
  if (node.type === "Identifier") {
    return { calleeText: node.name, rootName: node.name };
  }
  if (node.type === "MemberExpression") {
    const obj = node.object;
    const prop = node.property;
    const objName = obj && obj.type === "Identifier" ? obj.name : "<expr>";
    const propName =
      prop && prop.type === "Identifier"
        ? prop.name
        : prop && prop.type === "StringLiteral"
        ? prop.value
        : "<expr>";
    return {
      calleeText: `${objName}.${propName}`,
      rootName: obj && obj.type === "Identifier" ? obj.name : null,
    };
  }
  return { calleeText: "<expr>", rootName: null };
}

/**
 * Walks a JSXElement's attributes looking for `component={X}`, which is
 * how react-navigation registers a screen. Returns the identifier name
 * if present.
 */
function extractNavigationRegistration(node: any): string | null {
  if (node.type !== "JSXElement") return null;
  const attrs = node.openingElement?.attributes ?? [];
  for (const attr of attrs) {
    if (attr.type !== "JSXAttribute") continue;
    if (attr.name?.name !== "component" && attr.name?.name !== "getComponent")
      continue;
    const val = attr.value;
    if (!val) continue;
    if (val.type === "JSXExpressionContainer") {
      const expr = val.expression;
      if (expr.type === "Identifier") return expr.name;
      // getComponent={() => require('./Foo').default} — extract literal if possible
      if (expr.type === "ArrowFunctionExpression") {
        // Best-effort: try to find an Identifier inside the body
        const body = expr.body;
        if (body.type === "Identifier") return body.name;
      }
    }
  }
  return null;
}

export function analyzeFile(file: ScannedFile): AstFacts {
  const basename = path.basename(file.path, path.extname(file.path));

  const facts: AstFacts = {
    path: file.path,
    parseError: false,
    networkCalls: [],
    hasJsx: false,
    imports: [],
    navigatorFactoryCalls: 0,
    reactNavigationImports: 0,
    navigationRegistrations: [],
    defaultExportName: null,
    createContextCalls: 0,
    basename,
    exportCount: 0,
    useStateCalls: 0,
    useEffectCalls: 0,
    maxJsxDepth: 0,
    hookCallCount: 0,
    hookViolations: [],
    inlineStyleLines: [],
    nativeApiUsages: [],
  };

  // Local bindings (after import renaming) that refer to native APIs.
  // Maps local name → canonical API name (e.g. `AS` → `AsyncStorage`).
  const nativeBindings = new Map<string, string>();
  // Dedupe usage entries by `${line}:${name}` so a line with both
  // `Platform.OS === 'ios'` twice doesn't double-report.
  const nativeUsageSeen = new Set<string>();

  // Track JSX nesting depth as the traversal descends and ascends.
  let jsxDepth = 0;

  let ast;
  try {
    ast = parse(file.content, PARSER_OPTIONS);
  } catch {
    facts.parseError = true;
    return facts;
  }

  // Bindings that behave as HTTP clients (direct + aliased imports).
  const networkBindings = new Set<string>(DIRECT_NETWORK_CALLEES);

  traverse(ast, {
    ImportDeclaration(p) {
      const src = p.node.source.value;
      facts.imports.push({
        source: src,
        line: p.node.loc?.start.line ?? 0,
      });

      if (src.startsWith("@react-navigation/")) {
        facts.reactNavigationImports++;
      }

      if (NETWORK_PACKAGES.has(src)) {
        for (const spec of p.node.specifiers) {
          if (
            spec.type === "ImportDefaultSpecifier" ||
            spec.type === "ImportNamespaceSpecifier" ||
            spec.type === "ImportSpecifier"
          ) {
            networkBindings.add(spec.local.name);
          }
        }
      }

      // Native API bindings: imports from 'react-native' or any of the
      // standalone packages we recognize. Track the local name (which
      // may be aliased) → canonical API name for clearer messages.
      if (src === "react-native") {
        for (const spec of p.node.specifiers) {
          if (spec.type === "ImportSpecifier") {
            const importedName =
              spec.imported.type === "Identifier"
                ? spec.imported.name
                : spec.imported.value;
            if (NATIVE_API_RN_NAMES.has(importedName)) {
              nativeBindings.set(spec.local.name, importedName);
            }
          }
        }
      }
      const pkgCanonical = NATIVE_API_PACKAGES.get(src);
      if (pkgCanonical) {
        for (const spec of p.node.specifiers) {
          if (
            spec.type === "ImportDefaultSpecifier" ||
            spec.type === "ImportNamespaceSpecifier"
          ) {
            nativeBindings.set(spec.local.name, pkgCanonical);
          }
        }
      }
    },

    Identifier(p) {
      const name = p.node.name;
      if (!nativeBindings.has(name)) return;
      // Skip the binding's own import declaration site.
      const parentType = p.parent?.type;
      if (
        parentType === "ImportSpecifier" ||
        parentType === "ImportDefaultSpecifier" ||
        parentType === "ImportNamespaceSpecifier"
      )
        return;
      // Skip the property side of `obj.Platform` (a different `Platform`).
      if (
        parentType === "MemberExpression" &&
        (p.parent as any).property === p.node &&
        !(p.parent as any).computed
      )
        return;
      // Skip object property keys: `{ Platform: foo }`.
      if (
        (parentType === "ObjectProperty" || (parentType as string) === "Property") &&
        (p.parent as any).key === p.node &&
        !(p.parent as any).computed
      )
        return;

      const line = p.node.loc?.start.line ?? 0;
      const canonical = nativeBindings.get(name)!;
      const key = `${line}:${canonical}`;
      if (nativeUsageSeen.has(key)) return;
      nativeUsageSeen.add(key);
      facts.nativeApiUsages.push({ line, name: canonical });
    },

    JSXElement: {
      enter(p) {
        facts.hasJsx = true;
        jsxDepth++;
        if (jsxDepth > facts.maxJsxDepth) facts.maxJsxDepth = jsxDepth;
        const registered = extractNavigationRegistration(p.node);
        if (registered) facts.navigationRegistrations.push(registered);
      },
      exit() {
        jsxDepth--;
      },
    },
    JSXFragment() {
      facts.hasJsx = true;
    },

    JSXAttribute(p) {
      // Detect inline style objects on JSX elements:
      //   style={{ ... }}                  (direct object literal)
      //   style={[styles.foo, { ... }]}    (array with at least one literal)
      // These allocate a fresh object on every render — the canonical RN
      // recommendation is StyleSheet.create() once, then reference by key.
      const node = p.node as any;
      if (node.name?.name !== "style") return;
      const value = node.value;
      if (!value || value.type !== "JSXExpressionContainer") return;
      const expr = value.expression;
      const line = node.loc?.start.line ?? 0;
      if (expr.type === "ObjectExpression") {
        facts.inlineStyleLines.push(line);
        return;
      }
      if (expr.type === "ArrayExpression") {
        for (const el of expr.elements) {
          if (el && el.type === "ObjectExpression") {
            facts.inlineStyleLines.push(line);
            return;
          }
        }
      }
    },

    CallExpression(p) {
      const { calleeText, rootName } = describeCallee(p.node.callee);

      // Network call detection
      const isDirect = DIRECT_NETWORK_CALLEES.has(calleeText);
      const isAliased = rootName !== null && networkBindings.has(rootName);
      if (isDirect || isAliased) {
        facts.networkCalls.push({
          line: p.node.loc?.start.line ?? 0,
          callee: calleeText,
        });
      }

      // Classification signals
      if (NAVIGATOR_FACTORY_NAMES.has(calleeText)) {
        facts.navigatorFactoryCalls++;
      }
      if (calleeText === "createContext") {
        facts.createContextCalls++;
      }

      // Complexity signals consumed by rule 3.
      // We match the bare identifier (useState, useEffect) and also
      // the React.useState / React.useEffect member form.
      if (calleeText === "useState" || calleeText === "React.useState") {
        facts.useStateCalls++;
      }
      if (calleeText === "useEffect" || calleeText === "React.useEffect") {
        facts.useEffectCalls++;
      }

      // Rules of Hooks (consumed by rule 5)
      // Treat anything matching /^use[A-Z]/ as a hook call site, including
      // the React.useXxx member form.
      const hookCandidate = calleeText.startsWith("React.")
        ? calleeText.slice("React.".length)
        : calleeText;
      if (HOOK_NAME_RE.test(hookCandidate)) {
        facts.hookCallCount++;

        const fnPath = (p as any).getFunctionParent?.();
        const fnName = getEnclosingFunctionName(fnPath);
        const line = p.node.loc?.start.line ?? 0;

        if (!fnPath || !isComponentOrHook(fnName)) {
          facts.hookViolations.push({
            line,
            hookName: calleeText,
            reason: "non-hook-caller",
          });
        } else {
          // Walk up from the call site to the enclosing function and
          // bail if we cross any node type that would make the hook run
          // conditionally / non-deterministically.
          let curr: any = p.parentPath;
          let reason: HookViolation["reason"] | null = null;
          while (curr && curr !== fnPath) {
            const t = curr.node.type;
            if (t === "IfStatement" || t === "ConditionalExpression") {
              reason = "conditional";
              break;
            }
            if (
              t === "LogicalExpression" &&
              (curr.node.operator === "&&" || curr.node.operator === "||")
            ) {
              reason = "conditional";
              break;
            }
            if (
              t === "ForStatement" ||
              t === "WhileStatement" ||
              t === "DoWhileStatement" ||
              t === "ForInStatement" ||
              t === "ForOfStatement"
            ) {
              reason = "loop";
              break;
            }
            if (t === "SwitchCase") {
              reason = "switch";
              break;
            }
            if (t === "TryStatement" || t === "CatchClause") {
              reason = "try-catch";
              break;
            }
            curr = curr.parentPath;
          }
          if (reason) {
            facts.hookViolations.push({
              line,
              hookName: calleeText,
              reason,
            });
          }
        }
      }
    },

    ExportNamedDeclaration() {
      facts.exportCount++;
    },
    ExportAllDeclaration() {
      facts.exportCount++;
    },

    ExportDefaultDeclaration(p) {
      facts.exportCount++;
      const decl = p.node.declaration;
      if (decl.type === "Identifier") {
        facts.defaultExportName = decl.name;
      } else if (
        decl.type === "FunctionDeclaration" &&
        decl.id?.type === "Identifier"
      ) {
        facts.defaultExportName = decl.id.name;
      } else if (
        decl.type === "ClassDeclaration" &&
        decl.id?.type === "Identifier"
      ) {
        facts.defaultExportName = decl.id.name;
      }
    },
  });

  return facts;
}

export function analyzeFiles(files: ScannedFile[]): Map<string, AstFacts> {
  const map = new Map<string, AstFacts>();
  for (const f of files) {
    map.set(f.path, analyzeFile(f));
  }
  return map;
}
