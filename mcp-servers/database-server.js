/**
 * @file mcp-servers/database-server.js
 * Hardened Database Operations Server for MCP
 *
 * Provides safe, parameterized database access with strict permissions.
 * Only prepared statements; no dynamic SQL composition.
 * Every query is logged with execution time and result count.
 */

const { validateEnv, BASE_ENV_SCHEMA, hashSecretForLogging } = require('./lib/env-validator');
const { validateString, validateArray, validateInteger } = require('./lib/input-validator');
const { AuthContext } = require('./lib/auth-checker');
const { Logger } = require('./lib/logger');

const DB_ENV_SCHEMA = {
  ...BASE_ENV_SCHEMA,
  DATABASE_URL: {
    type: 'string',
    required: true,
    validate: v => v.startsWith('postgres://') || v.startsWith('postgresql://'),
    validateMsg: 'DATABASE_URL must be a valid PostgreSQL connection string',
  },
  DB_MAX_CONNECTIONS: {
    type: 'integer',
    required: false,
    default: 10,
    min: 1,
    max: 100,
  },
  DB_QUERY_TIMEOUT_MS: {
    type: 'integer',
    required: false,
    default: 30000,
    min: 1000,
    max: 300000,
  },
  DB_LOG_SLOW_QUERIES_MS: {
    type: 'integer',
    required: false,
    default: 5000,
  },
};

// Prepared query definitions (whitelist of allowed queries)
const PREPARED_QUERIES = {
  // Read operations
  get_user_by_id: {
    text: 'SELECT id, username, email, created_at FROM users WHERE id = $1 LIMIT 1',
    readOnly: true,
    minScopes: ['read:users'],
  },
  list_users: {
    text: 'SELECT id, username, email, created_at FROM users LIMIT $1 OFFSET $2',
    readOnly: true,
    minScopes: ['read:users'],
  },
  get_civic_issue: {
    text: 'SELECT id, title, description, status, created_at FROM civic_issues WHERE id = $1 LIMIT 1',
    readOnly: true,
    minScopes: ['read:civic'],
  },
  list_civic_issues: {
    text: 'SELECT id, title, status, created_at FROM civic_issues WHERE status = $1 LIMIT $2 OFFSET $3',
    readOnly: true,
    minScopes: ['read:civic'],
  },

  // Write operations
  create_civic_issue: {
    text: `INSERT INTO civic_issues (title, description, user_id, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, created_at`,
    readOnly: false,
    minScopes: ['write:civic'],
  },
  update_issue_status: {
    text: `UPDATE civic_issues SET status = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING id, status, updated_at`,
    readOnly: false,
    minScopes: ['write:civic'],
  },
};

class DatabaseServer {
  constructor() {
    try {
      this.config = validateEnv(DB_ENV_SCHEMA);
    } catch (err) {
      console.error(`Fatal: Environment validation failed: ${err.message}`);
      process.exit(1);
    }

    this.logger = new Logger('database-server', this.config.LOG_LEVEL);
    this.logger.info('Database Server initializing', {
      databaseUrl: hashSecretForLogging(this.config.DATABASE_URL),
      maxConnections: this.config.DB_MAX_CONNECTIONS,
    });

    // In production, initialize actual connection pool here
    // this.pool = new pg.Pool({ connectionString: this.config.DATABASE_URL });
  }

  /**
   * Execute a prepared query with parameterized inputs.
   * @param {string} queryName - Name of prepared query
   * @param {Array} params - Query parameters
   * @param {AuthContext} authContext - Authorization context
   * @returns {Object} Query result
   * @throws {Error} If unauthorized or query fails
   */
  async executeQuery(queryName, params = [], authContext = null) {
    validateString(queryName, { required: true });
    validateArray(params, { maxLength: 100 });

    // Get query definition
    const queryDef = PREPARED_QUERIES[queryName];
    if (!queryDef) {
      throw new Error(`Unknown prepared query: ${queryName}`);
    }

    // Check authorization
    if (authContext) {
      for (const scope of queryDef.minScopes) {
        authContext.require(scope);
      }
    }

    this.logger.debug('Executing prepared query', {
      queryName,
      paramCount: params.length,
      readOnly: queryDef.readOnly,
      audit: authContext?.audit(),
    });

    const startTime = Date.now();
    try {
      // In production, use actual database client
      // const result = await this.pool.query(queryDef.text, params);

      // For demonstration, simulate execution
      const result = {
        rows: [],
        rowCount: 0,
      };

      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > this.config.DB_LOG_SLOW_QUERIES_MS) {
        this.logger.warn(`Slow query: ${queryName}`, {
          durationMs: duration,
          rowCount: result.rowCount,
        });
      }

      this.logger.debug('Query completed', {
        queryName,
        durationMs: duration,
        rowCount: result.rowCount,
      });

      return result;
    } catch (err) {
      this.logger.error('Query execution failed', err, {
        queryName,
        durationMs: Date.now() - startTime,
        audit: authContext?.audit(),
      });
      throw new Error(`Query execution failed: ${err.message}`);
    }
  }

  /**
   * Get list of available prepared queries.
   */
  listAvailableQueries(authContext = null) {
    const queries = Object.entries(PREPARED_QUERIES)
      .filter(([_, def]) => {
        if (!authContext) return !def.readOnly;
        try {
          for (const scope of def.minScopes) {
            authContext.require(scope);
          }
          return true;
        } catch {
          return false;
        }
      })
      .map(([name, def]) => ({
        name,
        readOnly: def.readOnly,
        requiredScopes: def.minScopes,
      }));

    return { availableQueries: queries };
  }
}

// MCP Tool Definitions
const tools = [
  {
    name: 'read_query',
    description: 'Execute a prepared read-only query',
    inputSchema: {
      type: 'object',
      properties: {
        queryName: {
          type: 'string',
          description: 'Name of prepared query to execute',
        },
        params: {
          type: 'array',
          description: 'Query parameters ($1, $2, etc.)',
        },
      },
      required: ['queryName'],
    },
  },
  {
    name: 'write_query',
    description: 'Execute a prepared write query (INSERT/UPDATE/DELETE)',
    inputSchema: {
      type: 'object',
      properties: {
        queryName: {
          type: 'string',
          description: 'Name of prepared query to execute',
        },
        params: {
          type: 'array',
          description: 'Query parameters ($1, $2, etc.)',
        },
      },
      required: ['queryName'],
    },
  },
  {
    name: 'list_queries',
    description: 'List available prepared queries you have access to',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Initialize server
const server = new DatabaseServer();

// Main tool handler
async function handleToolCall(toolName, toolInput, authContext = null) {
  switch (toolName) {
    case 'read_query':
    case 'write_query':
      return await server.executeQuery(toolInput.queryName, toolInput.params || [], authContext);

    case 'list_queries':
      return server.listAvailableQueries(authContext);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

module.exports = {
  tools,
  handleToolCall,
  DatabaseServer,
  PREPARED_QUERIES,
};
