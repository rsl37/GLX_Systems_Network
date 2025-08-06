/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface DatabaseSchema {
  users: {
    id: number;
    email: string | null;
    password_hash: string | null;
    wallet_address: string | null;
    username: string;
    avatar_url: string | null;
    reputation_score: number;
    ap_balance: number;
    crowds_balance: number;
    gov_balance: number;
    roles: string;
    skills: string;
    badges: string;
    created_at: string;
    updated_at: string;
    email_verified: number;
    phone: string | null;
    phone_verified: number;
    two_factor_enabled: number;
    two_factor_secret: string | null;
  };
  help_requests: {
    id: number;
    requester_id: number;
    helper_id: number | null;
    title: string;
    description: string;
    category: string;
    urgency: string;
    latitude: number | null;
    longitude: number | null;
    skills_needed: string;
    media_url: string | null;
    media_type: string;
    is_offline_created: number;
    offline_created_at: string | null;
    matching_score: number;
    status: string;
    helper_confirmed_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    rating: number | null;
    feedback: string | null;
    created_at: string;
    updated_at: string;
  };
  crisis_alerts: {
    id: number;
    title: string;
    description: string;
    severity: string;
    latitude: number;
    longitude: number;
    radius: number;
    created_by: number;
    status: string;
    created_at: string;
    updated_at: string;
  };
  proposals: {
    id: number;
    title: string;
    description: string;
    category: string;
    created_by: number;
    deadline: string;
    status: string;
    votes_for: number;
    votes_against: number;
    created_at: string;
  };
  votes: {
    id: number;
    proposal_id: number;
    user_id: number;
    vote_type: string;
    delegate_id: number | null;
    created_at: string;
  };
  messages: {
    id: number;
    help_request_id: number;
    sender_id: number;
    message: string;
    created_at: string;
  };
  delegates: {
    id: number;
    delegator_id: number;
    delegate_id: number;
    category: string;
    created_at: string;
  };
  transactions: {
    id: number;
    user_id: number;
    type: string;
    amount: number;
    token_type: string;
    description: string | null;
    created_at: string;
  };
  chat_rooms: {
    id: number;
    help_request_id: number;
    requester_id: number;
    helper_id: number;
    status: string;
    created_at: string;
  };
  notifications: {
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    data: string;
    read_at: string | null;
    created_at: string;
  };
  user_connections: {
    id: number;
    user_id: number;
    socket_id: string;
    connected_at: string;
  };
  password_reset_tokens: {
    id: number;
    user_id: number;
    token: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
  };
  passkey_credentials: {
    id: number;
    user_id: number;
    credential_id: string;
    public_key: string;
    counter: number;
    device_name: string | null;
    created_at: string;
    last_used_at: string | null;
  };
  oauth_accounts: {
    id: number;
    user_id: number;
    provider: string;
    provider_id: string;
    provider_email: string | null;
    provider_name: string | null;
    access_token: string | null;
    refresh_token: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
  };
  email_verification_tokens: {
    id: number;
    user_id: number;
    token: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
  };
  phone_verification_tokens: {
    id: number;
    user_id: number;
    phone: string;
    code: string;
    expires_at: string;
    used_at: string | null;
    attempts: number;
    created_at: string;
  };
  kyc_verifications: {
    id: number;
    user_id: number;
    verification_level: string;
    document_type: string;
    document_number: string;
    document_image_url: string;
    document_hash: string;
    selfie_image_url: string | null;
    selfie_hash: string | null;
    verification_status: string;
    verified_at: string | null;
    expires_at: string | null;
    compliance_notes: string | null;
    risk_assessment: string;
    created_at: string;
    updated_at: string;
  };
  stablecoin_transactions: {
    id: number;
    user_id: number;
    transaction_type: string;
    amount: number;
    price_at_time: number;
    gas_fee: number;
    status: string;
    created_at: string;
    updated_at: string;
  };
  stablecoin_metrics: {
    id: number;
    timestamp: string;
    total_supply: number;
    reserve_pool: number;
    current_price: number;
    target_price: number;
    deviation: number;
    volatility: number;
    stability_score: number;
  };
  supply_adjustments: {
    id: number;
    action: string;
    amount: number;
    reason: string;
    target_price: number;
    current_price: number;
    new_supply: number;
    timestamp: string;
  };
  user_privacy: {
    id: number;
    user_id: number;
    show_email: number;
    show_phone: number;
    show_wallet: number;
    wallet_display_mode: string;
    created_at: string;
    updated_at: string;
  };
}

// Hybrid Database Configuration - SQLite for development/lightweight, PostgreSQL for production/heavy operations
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Database selection strategy
interface DatabaseStrategy {
  primary: 'sqlite' | 'postgresql';
  fallback: 'sqlite' | 'postgresql';
  useCase: string;
}

// Intelligent database selection based on use case and environment
function getDatabaseStrategy(): DatabaseStrategy {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasPostgresURL = !!DATABASE_URL;
<<<<<<< HEAD
<<<<<<< HEAD

  if (isProduction && hasPostgresURL) {
    return {
      primary: 'postgresql',
      fallback: 'sqlite',
      useCase: 'production-scale',
    };
  } else if (hasPostgresURL) {
    return {
      primary: 'postgresql',
      fallback: 'sqlite',
      useCase: 'development-with-postgres',
    };
  } else {
    return {
      primary: 'sqlite',
      fallback: 'postgresql',
      useCase: 'development-lightweight',
    };
  }
}

const strategy = getDatabaseStrategy();

=======
  
=======

>>>>>>> origin/copilot/fix-470
  if (isProduction && hasPostgresURL) {
    return {
      primary: 'postgresql',
      fallback: 'sqlite',
      useCase: 'production-scale'
    };
  } else if (hasPostgresURL) {
    return {
      primary: 'postgresql',
      fallback: 'sqlite',
      useCase: 'development-with-postgres'
    };
  } else {
    return {
      primary: 'sqlite',
      fallback: 'postgresql',
      useCase: 'development-lightweight'
    };
  }
}

const strategy = getDatabaseStrategy();

>>>>>>> origin/copilot/fix-190
// SQLite Configuration - Best for: Local development, file-based data, lightweight operations, offline support
const dataDir = process.env.DATA_DIRECTORY || './data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let sqliteDb: Database | null = null;
try {
  sqliteDb = new Database(path.join(dataDir, 'glx.db'), {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });
  console.log('✅ SQLite database initialized successfully.');
} catch (error) {
  console.error('❌ Failed to initialize SQLite database:', error.message);
  console.error('💡 Ensure the data directory is writable and the database file is not corrupted.');
  process.exit(1); // Exit the application with a failure code
}

<<<<<<< HEAD
<<<<<<< HEAD
// PostgreSQL Configuration - Best for: Production, complex queries, concurrent operations, scalable data
=======
// PostgreSQL Configuration - Best for: Production, complex queries, concurrent operations, scalable data  
>>>>>>> origin/copilot/fix-190
=======
// PostgreSQL Configuration - Best for: Production, complex queries, concurrent operations, scalable data
>>>>>>> origin/copilot/fix-470
let postgresPool: Pool | null = null;
if (DATABASE_URL) {
  console.log('🗄️ PostgreSQL database initialization...');
  console.log('📊 Using PostgreSQL from DATABASE_URL');
  console.log('🔗 Database URL configured:', DATABASE_URL.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs

  postgresPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000, // How long to try connecting before timing out
  });
} else {
<<<<<<< HEAD:GLX_App_files/server/database.ts
  console.log("🗄️ SQLite database initialization...");
  console.log("📊 Using SQLite for development/lightweight operations");
  console.log("🔗 Database file:", path.join(dataDir, 'glx.db'));
=======
  console.log('🗄️ SQLite database initialization...');
  console.log('📊 Using SQLite for development/lightweight operations');
  console.log('🔗 Database file:', path.join(dataDir, 'galax.db'));
>>>>>>> origin/all-merged:GALAX_App_files/server/database.ts
}

// Create database instances
const sqliteKysely = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({
    database: sqliteDb,
  }),
});

const postgresKysely = postgresPool
  ? new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({
        pool: postgresPool,
      }),
    })
  : null;

// Primary database based on strategy
const db = strategy.primary === 'postgresql' && postgresKysely ? postgresKysely : sqliteKysely;

console.log(`🎯 Database Strategy: ${strategy.useCase}`);
console.log(`🎯 Primary Database: ${strategy.primary.toUpperCase()}`);
console.log(`🎯 Fallback Database: ${strategy.fallback.toUpperCase()}`);

// Database selection utilities
const dbSelector = {
  // Use SQLite for: Local storage, file-based operations, development, offline mode
  sqlite: sqliteKysely,
<<<<<<< HEAD
<<<<<<< HEAD

  // Use PostgreSQL for: Production, complex queries, concurrent operations, scalable data
  postgres: postgresKysely,

  // Primary database (auto-selected based on environment and configuration)
  primary: db,

=======
  
=======

>>>>>>> origin/copilot/fix-470
  // Use PostgreSQL for: Production, complex queries, concurrent operations, scalable data
  postgres: postgresKysely,

  // Primary database (auto-selected based on environment and configuration)
  primary: db,
<<<<<<< HEAD
  
>>>>>>> origin/copilot/fix-190
=======

>>>>>>> origin/copilot/fix-470
  // Get optimal database for specific operations
  getOptimalDB: (operation: 'read' | 'write' | 'complex' | 'lightweight') => {
    switch (operation) {
      case 'lightweight':
        return sqliteKysely; // SQLite excels at simple queries
      case 'complex':
        return postgresKysely || sqliteKysely; // PostgreSQL for complex operations, fallback to SQLite
      case 'read':
        return strategy.primary === 'postgresql' ? postgresKysely || sqliteKysely : sqliteKysely;
      case 'write':
        return db; // Use primary database for writes
      default:
        return db;
    }
  },
<<<<<<< HEAD
<<<<<<< HEAD

  // Check if specific database is available
  isPostgresAvailable: () => !!postgresKysely,
  isSqliteAvailable: () => !!sqliteKysely,

=======
  
  // Check if specific database is available
  isPostgresAvailable: () => !!postgresKysely,
  isSqliteAvailable: () => !!sqliteKysely,
  
>>>>>>> origin/copilot/fix-190
=======

  // Check if specific database is available
  isPostgresAvailable: () => !!postgresKysely,
  isSqliteAvailable: () => !!sqliteKysely,

>>>>>>> origin/copilot/fix-470
  // Get database info
  getStrategy: () => strategy,
};

/**
 * Initialize database schema for both SQLite and PostgreSQL
 */
async function initializeDatabase() {
  console.log(`🔧 Initializing ${strategy.primary.toUpperCase()} database schema...`);
<<<<<<< HEAD
<<<<<<< HEAD

  try {
    // Initialize primary database
    await initializeDatabaseSchema(db, strategy.primary);

=======
  
  try {
    // Initialize primary database
    await initializeDatabaseSchema(db, strategy.primary);
    
>>>>>>> origin/copilot/fix-190
=======

  try {
    // Initialize primary database
    await initializeDatabaseSchema(db, strategy.primary);

>>>>>>> origin/copilot/fix-470
    // If we have both databases available, sync schema to fallback
    if (strategy.primary === 'postgresql' && postgresKysely && sqliteKysely) {
      console.log('🔄 Syncing schema to SQLite fallback...');
      await initializeDatabaseSchema(sqliteKysely, 'sqlite');
    } else if (strategy.primary === 'sqlite' && postgresKysely) {
      console.log('🔄 Syncing schema to PostgreSQL...');
      await initializeDatabaseSchema(postgresKysely, 'postgresql');
    }
<<<<<<< HEAD
<<<<<<< HEAD

    console.log('✅ Hybrid database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);

=======
    
    console.log("✅ Hybrid database schema initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database schema:", error);
    
>>>>>>> origin/copilot/fix-190
=======

    console.log("✅ Hybrid database schema initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database schema:", error);

>>>>>>> origin/copilot/fix-470
    // Try fallback database if primary fails
    if (strategy.primary === 'postgresql' && postgresKysely && sqliteKysely) {
      console.log('🔄 Falling back to SQLite...');
      try {
        await initializeDatabaseSchema(sqliteKysely, 'sqlite');
        console.log('✅ SQLite fallback initialized successfully');
      } catch (fallbackError) {
        console.error('❌ Fallback database initialization also failed:', fallbackError);
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
}

/**
 * Initialize schema for a specific database
 */
async function initializeDatabaseSchema(
  database: Kysely<DatabaseSchema>,
  dbType: 'sqlite' | 'postgresql'
) {
  const isPostgres = dbType === 'postgresql';
<<<<<<< HEAD
<<<<<<< HEAD

=======
  
>>>>>>> origin/copilot/fix-190
=======

>>>>>>> origin/copilot/fix-470
  // Create users table
  await database.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('email', 'varchar(255)')
    .addColumn('password_hash', 'text')
    .addColumn('wallet_address', 'varchar(255)')
    .addColumn('username', 'varchar(255)', col => col.notNull().unique())
    .addColumn('avatar_url', 'text')
    .addColumn('reputation_score', 'integer', col => col.defaultTo(0))
    .addColumn('ap_balance', 'integer', col => col.defaultTo(0))
    .addColumn('crowds_balance', 'integer', col => col.defaultTo(0))
    .addColumn('gov_balance', 'integer', col => col.defaultTo(0))
    .addColumn('roles', 'text', col => col.defaultTo('user'))
    .addColumn('skills', 'text', col => col.defaultTo(''))
    .addColumn('badges', 'text', col => col.defaultTo(''))
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .addColumn('updated_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .addColumn('email_verified', 'integer', col => col.defaultTo(0))
    .addColumn('phone', 'varchar(20)')
    .addColumn('phone_verified', 'integer', col => col.defaultTo(0))
    .addColumn('two_factor_enabled', 'integer', col => col.defaultTo(0))
    .addColumn('two_factor_secret', 'text')
    .execute();

  // Create help_requests table
  await database.schema
    .createTable('help_requests')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('requester_id', 'integer', col => col.references('users.id').onDelete('cascade'))
    .addColumn('helper_id', 'integer', col => col.references('users.id').onDelete('set null'))
    .addColumn('title', 'varchar(255)', col => col.notNull())
    .addColumn('description', 'text', col => col.notNull())
    .addColumn('category', 'varchar(50)', col => col.notNull())
    .addColumn('urgency', 'varchar(20)', col => col.notNull())
    .addColumn('latitude', isPostgres ? 'decimal(10, 8)' : 'numeric')
    .addColumn('longitude', isPostgres ? 'decimal(11, 8)' : 'numeric')
    .addColumn('skills_needed', 'text', col => col.defaultTo(''))
    .addColumn('media_url', 'text')
    .addColumn('media_type', 'varchar(50)', col => col.defaultTo(''))
    .addColumn('is_offline_created', 'integer', col => col.defaultTo(0))
    .addColumn('offline_created_at', isPostgres ? 'timestamp' : 'datetime')
    .addColumn('matching_score', 'integer', col => col.defaultTo(0))
    .addColumn('status', 'varchar(20)', col => col.defaultTo('open'))
    .addColumn('helper_confirmed_at', isPostgres ? 'timestamp' : 'datetime')
    .addColumn('started_at', isPostgres ? 'timestamp' : 'datetime')
    .addColumn('completed_at', isPostgres ? 'timestamp' : 'datetime')
    .addColumn('rating', 'integer')
    .addColumn('feedback', 'text')
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .addColumn('updated_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .execute();

  // Create messages table
  await database.schema
    .createTable('messages')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('help_request_id', 'integer', col =>
      col.references('help_requests.id').onDelete('cascade')
    )
    .addColumn('sender_id', 'integer', col => col.references('users.id').onDelete('cascade'))
    .addColumn('message', 'text', col => col.notNull())
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .execute();

  // Create notifications table
  await database.schema
    .createTable('notifications')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('user_id', 'integer', col => col.references('users.id').onDelete('cascade'))
    .addColumn('type', 'varchar(50)', col => col.notNull())
    .addColumn('title', 'varchar(255)', col => col.notNull())
    .addColumn('message', 'text', col => col.notNull())
    .addColumn('data', 'text', col => col.defaultTo('{}'))
    .addColumn('read_at', isPostgres ? 'timestamp' : 'datetime')
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .execute();

  // Create other essential tables...
  await createAdditionalTables(database, dbType);
}

/**
 * Create additional tables for the application
 */
async function createAdditionalTables(
  database: Kysely<DatabaseSchema>,
  dbType: 'sqlite' | 'postgresql'
) {
  const isPostgres = dbType === 'postgresql';
<<<<<<< HEAD
<<<<<<< HEAD

=======
  
>>>>>>> origin/copilot/fix-190
=======

>>>>>>> origin/copilot/fix-470
  // Crisis alerts table
  await database.schema
    .createTable('crisis_alerts')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('title', 'varchar(255)', col => col.notNull())
    .addColumn('description', 'text', col => col.notNull())
    .addColumn('severity', 'varchar(20)', col => col.notNull())
    .addColumn('latitude', isPostgres ? 'decimal(10, 8)' : 'real', col => col.notNull())
    .addColumn('longitude', isPostgres ? 'decimal(11, 8)' : 'real', col => col.notNull())
    .addColumn('radius', 'integer', col => col.notNull())
    .addColumn('created_by', 'integer', col => col.references('users.id').onDelete('cascade'))
    .addColumn('status', 'varchar(20)', col => col.defaultTo('active'))
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .addColumn('updated_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .execute();

  // Password reset tokens table
  await database.schema
    .createTable('password_reset_tokens')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('user_id', 'integer', col => col.references('users.id').onDelete('cascade'))
    .addColumn('token', 'varchar(255)', col => col.notNull().unique())
    .addColumn('expires_at', isPostgres ? 'timestamp' : 'datetime', col => col.notNull())
    .addColumn('used_at', isPostgres ? 'timestamp' : 'datetime')
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .execute();

  // Email verification tokens table
  await database.schema
    .createTable('email_verification_tokens')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('user_id', 'integer', col => col.references('users.id').onDelete('cascade'))
    .addColumn('token', 'varchar(255)', col => col.notNull().unique())
    .addColumn('expires_at', isPostgres ? 'timestamp' : 'datetime', col => col.notNull())
    .addColumn('used_at', isPostgres ? 'timestamp' : 'datetime')
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .execute();

  // Proposals table for governance system
  await database.schema
    .createTable('proposals')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('title', 'varchar(255)', col => col.notNull())
    .addColumn('description', 'text', col => col.notNull())
    .addColumn('category', 'varchar(50)', col => col.notNull())
    .addColumn('created_by', 'integer', col => col.references('users.id').onDelete('cascade'))
    .addColumn('deadline', isPostgres ? 'timestamp' : 'datetime', col => col.notNull())
    .addColumn('status', 'varchar(20)', col => col.defaultTo('active'))
    .addColumn('votes_for', 'integer', col => col.defaultTo(0))
    .addColumn('votes_against', 'integer', col => col.defaultTo(0))
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .execute();

  // Votes table for governance system
  await database.schema
    .createTable('votes')
    .ifNotExists()
    .addColumn('id', isPostgres ? 'serial' : 'integer', col => {
      col = col.primaryKey();
      return isPostgres ? col : col.autoIncrement();
    })
    .addColumn('proposal_id', 'integer', col => col.references('proposals.id').onDelete('cascade'))
    .addColumn('user_id', 'integer', col => col.references('users.id').onDelete('cascade'))
    .addColumn('vote_type', 'varchar(10)', col => col.notNull())
    .addColumn('delegate_id', 'integer', col => col.references('users.id').onDelete('set null'))
    .addColumn('created_at', isPostgres ? 'timestamp' : 'datetime', col =>
      col.defaultTo(isPostgres ? 'now()' : "datetime('now')")
    )
    .execute();

  console.log(`✅ Additional ${dbType.toUpperCase()} tables created successfully`);
}

/**
 * Health check for database connection
 */
async function healthCheck() {
  try {
    // Check primary database
    await db.selectFrom('users').select('id').limit(1).execute();
<<<<<<< HEAD
    const primaryStatus = { status: 'healthy', db: strategy.primary, timestamp: new Date().toISOString() };
<<<<<<< HEAD
<<<<<<< HEAD
=======
    const primaryStatus = {
      status: 'healthy',
      db: strategy.primary,
      timestamp: new Date().toISOString(),
    };
>>>>>>> origin/copilot/fix-488

=======
    
>>>>>>> origin/copilot/fix-190
=======

>>>>>>> origin/copilot/fix-470
    // Check fallback database if available
    let fallbackStatus = null;
    if (strategy.primary === 'postgresql' && sqliteKysely) {
      try {
        await sqliteKysely.selectFrom('users').select('id').limit(1).execute();
        fallbackStatus = { status: 'healthy', db: 'sqlite', timestamp: new Date().toISOString() };
      } catch {
        fallbackStatus = { status: 'unhealthy', db: 'sqlite', timestamp: new Date().toISOString() };
      }
    } else if (strategy.primary === 'sqlite' && postgresKysely) {
      try {
        await postgresKysely.selectFrom('users').select('id').limit(1).execute();
        fallbackStatus = {
          status: 'healthy',
          db: 'postgresql',
          timestamp: new Date().toISOString(),
        };
      } catch {
        fallbackStatus = {
          status: 'unhealthy',
          db: 'postgresql',
          timestamp: new Date().toISOString(),
        };
      }
    }
<<<<<<< HEAD
<<<<<<< HEAD

    return {
=======
    
    return { 
>>>>>>> origin/copilot/fix-190
=======

    return {
>>>>>>> origin/copilot/fix-470
      primary: primaryStatus,
      fallback: fallbackStatus,
      strategy: strategy,
    };
  } catch (error) {
<<<<<<< HEAD
    console.error("❌ Database health check failed:", error);
<<<<<<< HEAD
<<<<<<< HEAD
=======
    console.error('❌ Database health check failed:', error);
>>>>>>> origin/copilot/fix-488
    return {
      primary: {
        status: 'unhealthy',
        db: strategy.primary,
        error: error instanceof Error ? error.message : 'Unknown error',
<<<<<<< HEAD
        timestamp: new Date().toISOString()
=======
    return { 
=======
    return {
>>>>>>> origin/copilot/fix-470
      primary: {
        status: 'unhealthy',
        db: strategy.primary,
        error: error instanceof Error ? error.message : 'Unknown error',
<<<<<<< HEAD
        timestamp: new Date().toISOString() 
>>>>>>> origin/copilot/fix-190
=======
        timestamp: new Date().toISOString()
>>>>>>> origin/copilot/fix-470
=======
        timestamp: new Date().toISOString(),
>>>>>>> origin/copilot/fix-488
      },
      fallback: null,
      strategy: strategy,
    };
  }
}

/**
 * Gracefully close database connections
 */
async function closeDatabase() {
  try {
    if (postgresPool) {
      await postgresPool.end();
      console.log('🔌 PostgreSQL connections closed');
    }
<<<<<<< HEAD
<<<<<<< HEAD

=======
    
>>>>>>> origin/copilot/fix-190
=======

>>>>>>> origin/copilot/fix-470
    if (sqliteDb) {
      sqliteDb.close();
      console.log('🔌 SQLite database closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
}

// Initialize database on module load
let initializationPromise: Promise<void> | null = null;

function getInitializationPromise() {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase();
  }
  return initializationPromise;
}

// Export the database instance and utility functions
<<<<<<< HEAD
<<<<<<< HEAD
export {
  db,
  dbSelector,
  postgresPool,
  sqliteDb,
  healthCheck,
  closeDatabase,
=======
export { 
  db, 
  dbSelector,
  postgresPool,
  sqliteDb,
  healthCheck, 
  closeDatabase, 
>>>>>>> origin/copilot/fix-190
=======
export {
  db,
  dbSelector,
  postgresPool,
  sqliteDb,
  healthCheck,
  closeDatabase,
>>>>>>> origin/copilot/fix-470
  getInitializationPromise,
  initializeDatabase,
};

// Auto-initialize database in non-test environments
if (process.env.NODE_ENV !== 'test') {
  getInitializationPromise().catch(error => {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Graceful shutdown initiated...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Graceful shutdown initiated...');
  await closeDatabase();
  process.exit(0);
});

export default db;
