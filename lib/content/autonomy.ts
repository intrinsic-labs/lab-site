import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { autonomyData, type AutonomyData } from "./autonomy-schema";
export { fraction, plotted, coverageNote } from "./autonomy-schema";
export type { AutonomyMetric, AutonomyData } from "./autonomy-schema";
import { CONTENT_ROOT } from "./fs";

/**
 * The home-page specimen's data contract. The file is generated from the vault's own
 * logs and committed; the site never reads the vault live. A malformed file fails the
 * build loudly, like every other piece of content here.
 */
export async function readAutonomy(): Promise<AutonomyData> {
  const file = path.join(CONTENT_ROOT, "specimen/autonomy.json");
  const parsed = autonomyData.safeParse(JSON.parse(await fs.readFile(file, "utf8")));
  if (!parsed.success) {
    throw new Error(`content/specimen/autonomy.json is invalid:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
