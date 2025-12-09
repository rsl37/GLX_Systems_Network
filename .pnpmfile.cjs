/**
 * pnpm configuration file for GLX Civic Networking App
 * 
 * This file provides hooks to customize package resolution and handle
 * deprecated dependencies in the dependency tree.
 * 
 * Current Handling:
 * - path-match@1.2.4: Deprecated subdependency from @vercel/fun
 *   Status: Analyzed and verified secure (no known CVEs)
 *   See: DEPRECATED_DEPENDENCIES.md for full details
 * 
 * Security Policy:
 * - All overrides must be documented in DEPRECATED_DEPENDENCIES.md
 * - All packages must be verified against vulnerability databases
 * - Changes require security review
 */

function readPackage(pkg, context) {
  // Log deprecated package handling for transparency
  if (pkg.name === '@vercel/fun') {
    if (pkg.dependencies && pkg.dependencies['path-match']) {
      // Note: We document but don't modify this dependency
      // Reason: path-match@1.2.4 is deprecated but secure
      // It's required by @vercel/fun's internal routing logic
      // See DEPRECATED_DEPENDENCIES.md for analysis
      context.log(
        `ℹ️  Package ${pkg.name}@${pkg.version} uses deprecated path-match@1.2.4 ` +
        `(verified secure - see DEPRECATED_DEPENDENCIES.md)`
      )
    }
  }
  
  return pkg
}

module.exports = {
  hooks: {
    readPackage
  }
}
