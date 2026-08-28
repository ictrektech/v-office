// Site assets (templates, logos, icons) live at the deployment root. Under
// VOS sub-path deployments NEXT_PUBLIC_BASE_PATH carries that prefix ("" on
// standalone builds); root-absolute URLs must go through sitePath() or they
// resolve against the portal root and 404. Internal routes are exempt —
// next/link and router.push prepend the base path themselves.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function sitePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
