/**
 * Folder-path signal.
 *
 * The classic, most reliable signal: a file under `src/screens/` is a
 * screen, a file under `src/components/` is a component, etc. We match
 * on well-known directory names used by the React Native community.
 *
 * When a match is found the signal fires with `high` confidence — a
 * developer who puts a file under `screens/` almost always means it.
 */

import { ClassificationSignal, Layer, ScannedFile } from "../../types";

interface FolderRule {
  layer: Layer;
  markers: string[];
}

const FOLDER_RULES: FolderRule[] = [
  { layer: "screen", markers: ["/screens/", "/pages/", "/views/", "/scenes/"] },
  { layer: "component", markers: ["/components/", "/ui/", "/widgets/", "/elements/"] },
  {
    layer: "service",
    markers: ["/services/", "/api/", "/apis/", "/network/", "/data/", "/clients/", "/repositories/", "/gateway/"],
  },
  { layer: "hook", markers: ["/hooks/", "/use-cases/"] },
  { layer: "util", markers: ["/utils/", "/helpers/", "/lib/", "/libs/", "/common/", "/styles/", "/theme/"] },
  {
    layer: "state",
    markers: ["/store/", "/stores/", "/redux/", "/state/", "/contexts/", "/providers/", "/slices/", "/reducers/"],
  },
  { layer: "config", markers: ["/config/", "/constants/", "/configs/", "/env/"] },
  { layer: "navigation", markers: ["/navigation/", "/router/", "/routers/", "/routes/", "/navigators/"] },
];

export function folderSignal(file: ScannedFile): ClassificationSignal | null {
  const needle = "/" + file.path.toLowerCase().replace(/\\/g, "/");
  for (const rule of FOLDER_RULES) {
    const hit = rule.markers.find((m) => needle.includes(m));
    if (hit) {
      return {
        source: "folder",
        layer: rule.layer,
        confidence: "high",
        reason: `path contains '${hit}'`,
      };
    }
  }
  return null;
}
