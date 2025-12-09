/**
 * @file lib/input-validator.js
 * Strict input validation for all tool parameters.
 * Prevents injection, ensures type safety, enforces constraints.
 */

/**
 * Validates a string input.
 * @param {string} value - Input value
 * @param {Object} rules - Validation rules
 * @returns {string} Validated string
 * @throws {Error} If validation fails
 */
function validateString(value, rules = {}) {
  const {
    required = false,
    minLength = 0,
    maxLength = 10000,
    pattern = null,
    allowedChars = null,
  } = rules;

  if (!value) {
    if (required) {
      throw new Error('Required string value is missing');
    }
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected string, got ${typeof value}`);
  }

  if (value.length < minLength) {
    throw new Error(
      `String length ${value.length} < minimum ${minLength}`
    );
  }

  if (value.length > maxLength) {
    throw new Error(
      `String length ${value.length} > maximum ${maxLength}`
    );
  }

  if (pattern && !pattern.test(value)) {
    throw new Error(`String does not match required pattern: ${pattern}`);
  }

  if (allowedChars) {
    const disallowed = value
      .split('')
      .find((char) => !allowedChars.test(char));
    if (disallowed) {
      throw new Error(
        `String contains disallowed character: "${disallowed}"`
      );
    }
  }

  return value.trim();
}

/**
 * Validates an ID (UUID, numeric, alphanumeric).
 * @param {string|number} value - ID to validate
 * @param {Object} rules - Optional rules
 * @returns {string} Validated ID
 * @throws {Error} If invalid
 */
function validateId(value, rules = {}) {
  const { type = 'uuid', required = true } = rules;

  if (!value) {
    if (required) throw new Error('ID is required');
    return null;
  }

  const patterns = {
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    numeric: /^[0-9]+$/,
    alphanumeric: /^[a-z0-9_-]+$/i,
  };

  if (!patterns[type]) {
    throw new Error(`Unknown ID type: ${type}`);
  }

  const stringValue = String(value);
  if (!patterns[type].test(stringValue)) {
    throw new Error(`Invalid ${type} ID format: ${stringValue}`);
  }

  return stringValue;
}

/**
 * Validates an integer within bounds.
 * @param {number} value - Value to validate
 * @param {Object} rules - Bounds and options
 * @returns {number} Validated integer
 * @throws {Error} If invalid
 */
function validateInteger(value, rules = {}) {
  const { min = -Infinity, max = Infinity, required = false } = rules;

  if (value === null || value === undefined) {
    if (required) throw new Error('Integer value is required');
    return null;
  }

  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid integer: ${value}`);
  }

  if (num < min || num > max) {
    throw new Error(`Integer ${num} outside range [${min}, ${max}]`);
  }

  return num;
}

/**
 * Validates an email address.
 * @param {string} value - Email to validate
 * @returns {string} Validated, lowercased email
 * @throws {Error} If invalid
 */
function validateEmail(value) {
  const email = validateString(value, { required: true, maxLength: 254 });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid email format: ${email}`);
  }
  return email.toLowerCase();
}

/**
 * Validates a URL.
 * @param {string} value - URL to validate
 * @param {Object} rules - Optional allowed protocols, etc.
 * @returns {URL} Parsed URL object
 * @throws {Error} If invalid
 */
function validateUrl(value, rules = {}) {
  const { allowedProtocols = ['https'], required = true } = rules;
  const urlStr = validateString(value, { required });

  if (!urlStr) return null;

  try {
    const url = new URL(urlStr);
    if (!allowedProtocols.includes(url.protocol.replace(':', ''))) {
      throw new Error(
        `URL protocol not allowed. Expected: ${allowedProtocols.join(', ')}`
      );
    }
    return url;
  } catch (err) {
    throw new Error(`Invalid URL: ${err.message}`);
  }
}

/**
 * Validates an array of items.
 * @param {Array} value - Array to validate
 * @param {Object} rules - Min/max length, item type
 * @returns {Array} Validated array
 * @throws {Error} If invalid
 */
function validateArray(value, rules = {}) {
  const { minLength = 0, maxLength = 1000, itemValidator = null } = rules;

  if (!Array.isArray(value)) {
    throw new Error(`Expected array, got ${typeof value}`);
  }

  if (value.length < minLength) {
    throw new Error(
      `Array length ${value.length} < minimum ${minLength}`
    );
  }

  if (value.length > maxLength) {
    throw new Error(
      `Array length ${value.length} > maximum ${maxLength}`
    );
  }

  if (itemValidator) {
    return value.map((item, idx) => {
      try {
        return itemValidator(item);
      } catch (err) {
        throw new Error(`Array item [${idx}] failed validation: ${err.message}`);
      }
    });
  }

  return value;
}

module.exports = {
  validateString,
  validateId,
  validateInteger,
  validateEmail,
  validateUrl,
  validateArray,
};
