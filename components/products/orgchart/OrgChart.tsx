import { OrgChartInteractive } from "./OrgChartInteractive";
import { RoleList } from "./RoleList";

/**
 * The org chart as the how-it-works report places it: the interactive chart, then the same
 * roles as a plain list. The page renders it BETWEEN its two prose files rather than inside
 * the reading column, because the column's `.prose` rules (unlayered) would override the
 * chart's own type and colour on every `p`, `ul` and `li`.
 */
export function OrgChart() {
  return (
    <div className="my-4">
      <OrgChartInteractive />
      <RoleList />
    </div>
  );
}
