/**
 * Minimal structured logger so test steps and captured API responses show up
 * clearly in CI logs, instead of scattering ad-hoc console.log calls
 * through the test files.
 */
export const logger = {
  step: (message: string) => console.log(`[STEP] ${message}`),
  api: (message: string) => console.log(`[API]  ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
};
