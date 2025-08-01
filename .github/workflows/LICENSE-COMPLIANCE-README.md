# License Compliance System

This directory contains comprehensive license compliance checking tools for the GALAX Civic Networking App.

## Overview

The GALAX Civic Networking App uses the **PolyForm Shield License 1.0.0**, which is a restrictive license with noncompete provisions. This requires careful license compliance checking for all dependencies, external projects, APIs, and third-party code.

## Components

### 1. GitHub Workflow (`license-compliance.yml`)

Automated license compliance checking that runs on:
- Pull requests to main branches
- Weekly scheduled scans (Sundays at 3 AM UTC)
- Manual workflow dispatch

**Features:**
- Scans all NPM dependencies across the project
- Checks external project licenses (e.g., Resgrid)
- Validates license compatibility with PolyForm Shield
- Monitors external API usage and terms
- Validates THIRD_PARTY_LICENSES.md documentation
- Generates comprehensive compliance reports
- Creates issues for violations
- Comments on PRs with compliance status

### 2. Shell Script (`license-compliance-check.sh`)

Standalone script for local license compliance checking.

**Usage:**
```bash
# From project root
./scripts/license-compliance-check.sh
```

**Features:**
- Comprehensive license scanning
- Compatibility matrix checking
- External project analysis
- API license verification
- Documentation validation
- Detailed reporting

### 3. License Compatibility Matrix

**Compatible with PolyForm Shield 1.0.0:**
- MIT License
- BSD-2-Clause, BSD-3-Clause
- ISC License
- Apache-2.0 License
- Unlicense
- WTFPL
- CC0-1.0
- 0BSD

**Incompatible (Prohibited):**
- GPL family (GPL-2.0, GPL-3.0)
- AGPL family (AGPL-1.0, AGPL-3.0)
- LGPL family (LGPL-2.0, LGPL-2.1, LGPL-3.0)
- Eclipse Public License (EPL-1.0, EPL-2.0)
- Mozilla Public License (MPL-1.1, MPL-2.0)
- Common Development and Distribution License (CDDL-1.0, CDDL-1.1)
- European Union Public License (EUPL-1.1, EUPL-1.2)
- Open Software License (OSL-3.0)

**Review Required:**
- Apache-1.1
- BSD-4-Clause
- Creative Commons licenses (CC-BY-4.0, CC-BY-SA-4.0)
- LaTeX Project Public License (LPPL-1.3c)
- Microsoft licenses (MS-PL, MS-RL)
- SIL Open Font License (OFL-1.1)
- Zlib License

## Reports

License compliance reports are generated in the `license-compliance-reports/` directory:

- `latest-license-compliance-report.txt` - Most recent report
- `license-compliance-report-YYYYMMDD_HHMMSS.txt` - Timestamped reports
- `*-licenses.json` - Machine-readable license data
- `*-licenses.csv` - CSV format for analysis

## Manual License Review Process

1. **New Dependency Addition:**
   - Run local compliance check before adding
   - Verify license compatibility
   - Update THIRD_PARTY_LICENSES.md if needed

2. **Quarterly Review:**
   - Run comprehensive scan
   - Review all "Review Required" licenses
   - Update documentation
   - Check for license changes in dependencies

3. **External API Changes:**
   - Review API terms of service
   - Verify commercial use permissions
   - Document in THIRD_PARTY_LICENSES.md

## Troubleshooting

### Common Issues

**"license-checker not found"**
```bash
npm install -g license-checker@25.0.1
```

**"npm ci failed"**
- Check Node.js version (>=18.0.0 required)
- Verify package-lock.json exists
- Clear npm cache: `npm cache clean --force`

**License Violations Found**
1. Identify the violating package
2. Find alternative with compatible license
3. Request license exception if critical
4. Remove or replace the dependency

### False Positives

Some packages may be flagged incorrectly:
- Dual-licensed packages (check all license options)
- License identifier inconsistencies
- Custom license texts

Review the actual license text in these cases.

## Integration

### CI/CD Integration

The license compliance workflow integrates with:
- **Security Workflow**: Basic license restrictions
- **Comprehensive Checks**: Overall quality gates
- **Release Workflow**: Pre-release compliance verification

### Pre-commit Hooks

Consider adding license checking to pre-commit hooks:
```bash
# In .git/hooks/pre-commit
./scripts/license-compliance-check.sh
```

## License Updates

When updating this system:

1. **Workflow Changes**: Test on feature branch first
2. **Script Updates**: Verify backward compatibility
3. **Matrix Updates**: Review legal implications
4. **Documentation**: Update THIRD_PARTY_LICENSES.md

## Support

For license compliance questions:
1. Review this documentation
2. Check the latest compliance report
3. Consult legal team for complex cases
4. Update documentation for future reference

## Files

- `license-compliance.yml` - GitHub Actions workflow
- `license-compliance-check.sh` - Standalone checking script
- `LICENSE-COMPLIANCE-README.md` - This documentation
- `../THIRD_PARTY_LICENSES.md` - Third-party license documentation

Last updated: January 2025