import { rule1ServiceLayer } from "./rule1-service-layer";
import { rule2CircularDeps } from "./rule2-circular-deps";
import { rule3FileSize } from "./rule3-file-size";
import { rule4LayerSeparation } from "./rule4-layer-separation";
import { rule5RulesOfHooks } from "./rule5-rules-of-hooks";
import { rule6InlineStyles } from "./rule6-inline-styles";
import { rule7Naming } from "./rule7-naming";
import { rule8NativeApiInUi } from "./rule8-native-api-in-ui";
import { Rule } from "./types";

/** All rules in the order they should appear in reports. */
export const RULES: Rule[] = [
  rule1ServiceLayer,
  rule2CircularDeps,
  rule3FileSize,
  rule4LayerSeparation,
  rule5RulesOfHooks,
  rule6InlineStyles,
  rule7Naming,
  rule8NativeApiInUi,
];
