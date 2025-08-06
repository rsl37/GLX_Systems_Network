---
title: "Express Read-Only Property Workaround Pattern"
description: ""
lastUpdated: "2025-08-03"
nextReview: "2025-09-03"
contentType: "documentation"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# Express Read-Only Property Workaround Pattern

## Overview

This document explains the pattern used in our security middleware to handle Express's read-only request properties, specifically for `req.query`, `req.params`, and similar objects.

## The Problem

Express.js marks certain request properties as read-only for security reasons. This means you cannot directly modify individual properties using standard JavaScript techniques:

```typescript
// ❌ These approaches DO NOT work with Express read-only properties:
Object.assign(req.query, sanitizedQuery); // Fails: read-only
req.query = { ...req.query, ...newValues }; // Fails: doesn't modify req object
req.query.someKey = newValue; // Fails: read-only
```

## The Solution

Our security middleware uses **complete object reassignment** to work around this limitation:

```typescript
// ✅ This approach WORKS:
if (req.query) {
  req.query = sanitizeObject(req.query);
}
```

## Why This Works

1. **Preserves Express Security Model**: We don't circumvent Express's read-only protections
2. **Complete Sanitization**: All nested properties are recursively sanitized
3. **Maintains Object Structure**: The original object structure is preserved
4. **Type Safety**: TypeScript types remain consistent

## Implementation Details

The pattern is implemented in `/server/middleware/security.ts`:

```typescript
// Sanitize query parameters
// NOTE: Express req.query is read-only by default, but we can work around this limitation
// by reassigning the entire property. This is a documented pattern for security middleware
// that needs to modify read-only Express request properties.
if (req.query) {
  // Create a completely new sanitized query object and reassign the entire property
  req.query = sanitizeObject(req.query);
}
```

## Security Benefits

This approach provides several security advantages:

1. **XSS Prevention**: Removes `<script>` tags and other dangerous HTML
2. **Protocol Injection Protection**: Strips `javascript:` protocols
3. **Event Handler Removal**: Eliminates `onclick=` and similar handlers
4. **Deep Sanitization**: Recursively processes nested objects and arrays

## Usage Examples

The middleware automatically sanitizes all incoming requests:

```typescript
// Before sanitization:
req.query = {
  search: '<script>alert("xss")</script>user input',
  category: 'books',
  filters: {
    author: 'javascript:alert("bad")',
    tags: ['<script>tag1</script>', 'safe-tag'],
  },
};

// After sanitization:
req.query = {
  search: 'user input', // Script tags removed
  category: 'books', // Safe content preserved
  filters: {
    author: 'alert("bad")', // JavaScript protocol removed
    tags: ['', 'safe-tag'], // Nested arrays sanitized
  },
};
```

## Alternative Approaches Considered

We evaluated several other approaches before settling on complete reassignment:

1. **Property Descriptors**: Too complex and doesn't work with all Express versions
2. **Proxy Objects**: Adds unnecessary complexity and potential performance overhead
3. **Deep Cloning with Merge**: Still fails due to read-only restrictions
4. **Custom Request Objects**: Would break compatibility with Express ecosystem

## Best Practices

When implementing similar patterns:

1. **Document the Workaround**: Always explain why complete reassignment is necessary
2. **Preserve Structure**: Ensure the sanitized object maintains the original structure
3. **Test Thoroughly**: Verify that object references change but functionality remains intact
4. **Consider Performance**: Complete reassignment is fast for typical request sizes

## Testing

You can test this pattern manually using the provided test script:

```bash
npx tsx /tmp/manual-test-security.ts
```

This demonstrates that:

- Object references change (confirming the workaround works)
- Content is properly sanitized
- Structure is preserved
- Nested objects are handled correctly

## References

- [Express.js Request Object Documentation](https://expressjs.com/en/api.html#req)
- [Node.js Object Property Descriptors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
- [Security Best Practices for Express](https://expressjs.com/en/advanced/best-practice-security.html)
