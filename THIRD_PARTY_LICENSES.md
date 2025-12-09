---
title: "Third-Party Licenses"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "legal"
maintainer: "rsl37"
version: "1.1.0"
tags: []
relatedDocs: []
---

# Third-Party Licenses

This document provides information about third-party software components used in the GLX Civic Networking App and their respective licenses.

## External Projects

### Resgrid
- **Location**: `external/resgrid/`
- **License**: Apache License 2.0
- **Copyright**: Copyright Resgrid Contributors
- **Description**: Emergency response platform integrated into GLX for emergency coordination features
- **License File**: `external/resgrid/LICENSE`
- **Website**: https://github.com/Resgrid/Core

## NPM Dependencies

### Production Dependencies (GLX_App_files)

#### Major Components

**React Ecosystem**
- `react@18.3.1` - MIT License
- `react-dom@18.3.1` - MIT License  
- `react-router-dom@^7.7.1` - MIT License

**UI Libraries**
- `@radix-ui/react-avatar@^1.1.10` - MIT License
- `@radix-ui/react-checkbox@1.3.2` - MIT License
- `@radix-ui/react-dialog@1.1.14` - MIT License
- `@radix-ui/react-label@2.1.7` - MIT License
- `@radix-ui/react-popover@1.1.14` - MIT License
- `@radix-ui/react-progress@1.1.7` - MIT License
- `@radix-ui/react-select@2.2.5` - MIT License
- `@radix-ui/react-slider@1.3.5` - MIT License
- `@radix-ui/react-slot@1.2.3` - MIT License
- `@radix-ui/react-switch@1.2.5` - MIT License
- `@radix-ui/react-tabs@^1.1.12` - MIT License
- `@radix-ui/react-toggle@1.1.9` - MIT License
- `@radix-ui/react-tooltip@1.2.7` - MIT License
- `framer-motion@^12.23.12` - MIT License
- `lucide-react@0.535.0` - ISC License

**Styling**
- `tailwindcss@3.4.17` - MIT License
- `tailwind-merge@3.3.1` - MIT License
- `tailwindcss-animate@1.0.7` - MIT License
- `class-variance-authority@0.7.1` - Apache-2.0 License
- `clsx@2.1.1` - MIT License

**Server & API**
- `express@5.1.0` - MIT License
- `express-rate-limit@^8.0.1` - MIT License
- `express-validator@^7.2.1` - MIT License
- `cors@^2.8.5` - MIT License
- `helmet@^8.1.0` - MIT License
- `compression@^1.8.1` - MIT License

**Database**
- `kysely@^0.28.3` - MIT License
- `better-sqlite3@^12.2.0` - BSD-2-Clause License
- `pg@^8.16.3` - MIT License

**Authentication & Security**
- `bcryptjs@^3.0.2` - MIT License
- `jsonwebtoken@^9.0.2` - MIT License
- `speakeasy@^2.0.0` - MIT License

**Post-Quantum Cryptography**
- `@noble/post-quantum@^0.4.1` - MIT License
- `crystals-kyber@^5.1.0` - MIT License
- `dilithium-js@^1.8.7` - MIT License

**Real-time Communication**
- `socket.io@^4.8.1` - MIT License
- `socket.io-client@^4.8.1` - MIT License
- `pusher@^5.2.0` - MIT License
- `pusher-js@^8.4.0` - MIT License

**Maps & Location**
- `@googlemaps/js-api-loader@^1.16.10` - Apache-2.0 License
- `leaflet@^1.9.4` - BSD-2-Clause License

**Utilities**
- `dotenv@^17.2.1` - BSD-2-Clause License
- `fs-extra@^11.3.0` - MIT License
- `multer@^2.0.2` - MIT License
- `nodemailer@^7.0.5` - MIT License
- `qrcode@^1.5.4` - MIT License
- `check-disk-space@^3.4.0` - MIT License

**Analytics**
- `@vercel/analytics@^1.5.0` - MIT License
- `@vercel/speed-insights@^1.2.0` - MIT License

**UI Components**
- `cmdk@1.1.1` - MIT License
- `react-day-picker@8.10.1` - MIT License

#### Development Dependencies

**Testing**
- `@playwright/test@^1.54.1` - Apache-2.0 License
- `@testing-library/jest-dom@^6.6.3` - MIT License
- `@testing-library/react@^16.3.0` - MIT License
- `@testing-library/user-event@^14.6.1` - MIT License
- `vitest@^3.2.4` - MIT License
- `@vitest/coverage-v8@^3.2.4` - MIT License
- `@vitest/ui@^3.2.4` - MIT License
- `jsdom@^26.1.0` - MIT License
- `supertest@^7.1.4` - MIT License

**Build Tools**
- `vite@^6.3.5` - MIT License
- `@vitejs/plugin-react@4.7.0` - MIT License
- `vite-plugin-compression@^0.5.1` - MIT License
- `esbuild@0.25.8` - MIT License
- `typescript@5.8.3` - Apache-2.0 License
- `tsx@^4.20.3` - MIT License

**Performance & Analysis**
- `autocannon@^8.0.0` - MIT License
- `webpack-bundle-analyzer@^4.10.2` - MIT License
- `@lhci/cli@^0.15.1` - Apache-2.0 License

### MCP Servers Dependencies

**Model Context Protocol**
- `@modelcontextprotocol/sdk@^0.4.0` - MIT License
- `jsonwebtoken@^9.0.2` - MIT License

## Embedded Third-Party Libraries (Resgrid)

The Resgrid external project includes numerous third-party JavaScript libraries with various licenses:

### JavaScript Libraries
- **jQuery** - MIT License
- **Bootstrap** - MIT License
- **SweetAlert** - MIT License
- **Chart.js/C3.js** - MIT License
- **Leaflet** - BSD-2-Clause License
- **FullCalendar** - MIT License
- **CodeMirror** - MIT License
- **D3.js** - BSD-3-Clause License
- **Cropper.js** - MIT License
- **jPlayer** - MIT License
- **Morris.js** - BSD-2-Clause License
- **Rickshaw** - MIT License
- **Slick Carousel** - MIT License
- **TailwindCSS** - MIT License
- **Algolia Autocomplete** - MIT License
- **SurveyJS** - MIT License
- **Plyr** - MIT License
- **jsTree** - MIT License
- **Ladda** - MIT License
- **Pace** - MIT License

*Note: The above list represents major libraries found in the Resgrid codebase. For complete license information of embedded libraries, refer to individual package.json files in the `external/resgrid/Web/Resgrid.Web/wwwroot/lib/` directory.*

## Package Overrides

The following package overrides are applied in the main application:
- `inflight`: `npm:@isaacs/inflight@^1.0.0` - ISC License
- `glob`: `^10.0.0` - ISC License
- `rimraf`: `^5.0.0` - ISC License
- `uuid`: `^10.0.0` - MIT License

## Transitive Dependencies

This document covers direct dependencies. Each package may include additional transitive (indirect) dependencies with their own licenses. For complete license information of all dependencies, you can run:

```bash
cd GLX_App_files
npm ls --long
```

## License Compliance

- **GLX Civic Networking App**: PolyForm Shield License 1.0.0
- **Most NPM Dependencies**: MIT License (permissive)
- **External Resgrid Project**: Apache License 2.0 (permissive)
- **Some Build Tools**: Apache-2.0 License (permissive)
- **Database/System Libraries**: Various permissive licenses (MIT, BSD)

All third-party dependencies use permissive open-source licenses that are compatible with the GLX Civic Networking App's PolyForm Shield License 1.0.0.

### Reviewed Licenses

The following licenses have been reviewed and confirmed compatible with the GLX Civic Networking App:

#### BlueOak-1.0.0 (Blue Oak Model License)
- **Status**: ✅ Compatible
- **Packages**: `jackspeak`, `package-json-from-dist`, `path-scurry`
- **Review Notes**: BlueOak-1.0.0 is a permissive OSI-approved license similar to MIT/Apache. It grants broad rights for use, modification, and distribution with minimal restrictions. It is fully compatible with PolyForm Shield License 1.0.0.
- **Reference**: https://blueoakcouncil.org/license/1.0.0

#### MPL-2.0 (Mozilla Public License 2.0)
- **Status**: ✅ Compatible (with conditions)
- **Packages**: `@vercel/analytics`
- **Review Notes**: MPL-2.0 is a "weak copyleft" license that allows commercial and proprietary use. It only requires that modifications to MPL-licensed files be released under MPL-2.0. Since we use `@vercel/analytics` as a dependency without modification, it is compatible with our license. The rest of our proprietary codebase is not affected.
- **Reference**: https://www.mozilla.org/en-US/MPL/2.0/

#### MIT-0 (MIT No Attribution)
- **Status**: ✅ Compatible
- **Packages**: `nodemailer`
- **Review Notes**: MIT-0 is even more permissive than the standard MIT license, removing the attribution requirement. It is fully compatible with PolyForm Shield License 1.0.0.
- **Reference**: https://opensource.org/license/mit-0

## Updates

This document should be updated when:
- New direct dependencies are added
- Major version upgrades occur
- External projects are added or removed
- License terms of dependencies change

Last updated: November 2025
