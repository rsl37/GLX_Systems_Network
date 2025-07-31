/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

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

// Database configuration - PostgreSQL for Vercel deployment
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required for PostgreSQL connection");
  throw new Error("DATABASE_URL environment variable is required");
}

console.log("🗄️ Database initialization...");
console.log("📊 Using PostgreSQL from DATABASE_URL");
console.log(
  "🔗 Database URL configured:",
  DATABASE_URL.replace(/\/\/.*@/, "//***:***@"),
); // Hide credentials in logs

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to try connecting before timing out
});

// Create Kysely instance with PostgreSQL dialect
const db = new Kysely<DatabaseSchema>({
  dialect: new PostgresDialect({
    pool,
  }),
});

/**
 * Initialize database schema - creates tables if they don't exist
 */
async function initializeDatabase() {
  try {
    console.log("🔧 Initializing PostgreSQL database schema...");

    // Create users table
    await db.schema
      .createTable('users')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('email', 'varchar(255)')
      .addColumn('password_hash', 'text')
      .addColumn('wallet_address', 'varchar(255)')
      .addColumn('username', 'varchar(255)', (col) => col.notNull().unique())
      .addColumn('avatar_url', 'text')
      .addColumn('reputation_score', 'integer', (col) => col.defaultTo(0))
      .addColumn('ap_balance', 'integer', (col) => col.defaultTo(0))
      .addColumn('crowds_balance', 'integer', (col) => col.defaultTo(0))
      .addColumn('gov_balance', 'integer', (col) => col.defaultTo(0))
      .addColumn('roles', 'text', (col) => col.defaultTo('user'))
      .addColumn('skills', 'text', (col) => col.defaultTo(''))
      .addColumn('badges', 'text', (col) => col.defaultTo(''))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo('now()'))
      .addColumn('email_verified', 'integer', (col) => col.defaultTo(0))
      .addColumn('phone', 'varchar(20)')
      .addColumn('phone_verified', 'integer', (col) => col.defaultTo(0))
      .addColumn('two_factor_enabled', 'integer', (col) => col.defaultTo(0))
      .addColumn('two_factor_secret', 'text')
      .execute();

    // Create help_requests table
    await db.schema
      .createTable('help_requests')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('requester_id', 'integer', (col) => col.references('users.id').onDelete('cascade'))
      .addColumn('helper_id', 'integer', (col) => col.references('users.id').onDelete('set null'))
      .addColumn('title', 'varchar(255)', (col) => col.notNull())
      .addColumn('description', 'text', (col) => col.notNull())
      .addColumn('category', 'varchar(50)', (col) => col.notNull())
      .addColumn('urgency', 'varchar(20)', (col) => col.notNull())
      .addColumn('latitude', 'decimal(10, 8)')
      .addColumn('longitude', 'decimal(11, 8)')
      .addColumn('skills_needed', 'text', (col) => col.defaultTo(''))
      .addColumn('media_url', 'text')
      .addColumn('media_type', 'varchar(50)', (col) => col.defaultTo(''))
      .addColumn('is_offline_created', 'integer', (col) => col.defaultTo(0))
      .addColumn('offline_created_at', 'timestamp')
      .addColumn('matching_score', 'integer', (col) => col.defaultTo(0))
      .addColumn('status', 'varchar(20)', (col) => col.defaultTo('open'))
      .addColumn('helper_confirmed_at', 'timestamp')
      .addColumn('started_at', 'timestamp')
      .addColumn('completed_at', 'timestamp')
      .addColumn('rating', 'integer')
      .addColumn('feedback', 'text')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo('now()'))
      .execute();

    // Create messages table
    await db.schema
      .createTable('messages')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('help_request_id', 'integer', (col) => col.references('help_requests.id').onDelete('cascade'))
      .addColumn('sender_id', 'integer', (col) => col.references('users.id').onDelete('cascade'))
      .addColumn('message', 'text', (col) => col.notNull())
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
      .execute();

    // Create notifications table
    await db.schema
      .createTable('notifications')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('user_id', 'integer', (col) => col.references('users.id').onDelete('cascade'))
      .addColumn('type', 'varchar(50)', (col) => col.notNull())
      .addColumn('title', 'varchar(255)', (col) => col.notNull())
      .addColumn('message', 'text', (col) => col.notNull())
      .addColumn('data', 'text', (col) => col.defaultTo('{}'))
      .addColumn('read_at', 'timestamp')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
      .execute();

    // Create other essential tables...
    await createAdditionalTables();

    console.log("✅ Database schema initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database schema:", error);
    throw error;
  }
}

/**
 * Create additional tables for the application
 */
async function createAdditionalTables() {
  // Crisis alerts table
  await db.schema
    .createTable('crisis_alerts')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('severity', 'varchar(20)', (col) => col.notNull())
    .addColumn('latitude', 'decimal(10, 8)', (col) => col.notNull())
    .addColumn('longitude', 'decimal(11, 8)', (col) => col.notNull())
    .addColumn('radius', 'integer', (col) => col.notNull())
    .addColumn('created_by', 'integer', (col) => col.references('users.id').onDelete('cascade'))
    .addColumn('status', 'varchar(20)', (col) => col.defaultTo('active'))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo('now()'))
    .execute();

  // Password reset tokens table
  await db.schema
    .createTable('password_reset_tokens')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'integer', (col) => col.references('users.id').onDelete('cascade'))
    .addColumn('token', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamp', (col) => col.notNull())
    .addColumn('used_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
    .execute();

  // Email verification tokens table
  await db.schema
    .createTable('email_verification_tokens')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'integer', (col) => col.references('users.id').onDelete('cascade'))
    .addColumn('token', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamp', (col) => col.notNull())
    .addColumn('used_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
    .execute();

  console.log("✅ Additional tables created successfully");
}

/**
 * Health check for database connection
 */
async function healthCheck() {
  try {
    await db.selectFrom('users').select('id').limit(1).execute();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    };
  }
}

/**
 * Gracefully close database connections
 */
async function closeDatabase() {
  try {
    await pool.end();
    console.log("🔌 Database connections closed");
  } catch (error) {
    console.error("❌ Error closing database connections:", error);
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
export { 
  db, 
  pool, 
  healthCheck, 
  closeDatabase, 
  getInitializationPromise,
  initializeDatabase 
};

// Auto-initialize database in non-test environments
if (process.env.NODE_ENV !== 'test') {
  getInitializationPromise().catch(error => {
    console.error("❌ Failed to initialize database:", error);
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