import { CustomerDashboard } from "../CustomerDashboard";

/**
 * RequestHistory Component
 * Maintained for backwards-compatibility and route redirection.
 * Renders CustomerDashboard in complete history view mode.
 */
export function RequestHistory() {
  return <CustomerDashboard initialView="all" />;
}

export default RequestHistory;
