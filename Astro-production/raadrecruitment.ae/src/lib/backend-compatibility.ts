/**
 * Content compatibility only; never an authentication or delivery switch.
 * The managed root launcher sets this exact nonsecret path. Secretless frontend
 * and offline build environments omit it. Capture once per process, not request.
 */
export const USE_BACKEND_COMPATIBILITY =
  process.env.INTERNAL_ADMIN_DIR === "/data/internal-admin";
