// Metro configuration for an Expo app inside an npm-workspaces monorepo.
//
// Two changes vs. the default Expo config:
//   1. watchFolders includes the workspace root, so Metro picks up
//      changes in @archlens/runtime (which lives outside this app's
//      folder) and hot-reloads them.
//   2. nodeModulesPaths includes both this app's local node_modules
//      and the hoisted root node_modules — npm workspaces hoists
//      most deps to the root, but Expo and platform-specific bins
//      stay local, so we look in both.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Disable hierarchical lookup so Metro doesn't accidentally resolve
// duplicates of React from a nested node_modules — common cause of
// "two copies of React" errors in monorepos.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
