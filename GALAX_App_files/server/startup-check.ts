/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { runDatabaseDiagnostics } from './debug.js';
import { db, healthCheck } from './database.js';

export async function performStartupCheck() {
  console.log('🚀 Performing startup check...');
  
  try {
    // Check environment variables
    console.log('🌍 Environment check:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - PORT:', process.env.PORT);
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
    console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
    
    // Check database connection
    console.log('🗄️ Database connection check:');
    const dbHealth = await healthCheck();
    
    if (dbHealth.status === 'healthy') {
      console.log('✅ PostgreSQL database connection successful');
    } else {
      console.log('❌ PostgreSQL database connection failed:', dbHealth.error);
      throw new Error(`Database connection failed: ${dbHealth.error}`);
    }
    
    // Check database diagnostics
    console.log('🗄️ Database diagnostics:');
    await runDatabaseDiagnostics();
    
    // Check required tables
    console.log('📋 Required tables check:');
    const requiredTables = [
      'users', 'help_requests', 'crisis_alerts', 'messages', 
      'notifications', 'password_reset_tokens', 'email_verification_tokens'
    ];
    
    let allTablesExist = true;
    for (const tableName of requiredTables) {
      try {
        const result = await db
          .selectFrom(tableName as any)
          .select(db.fn.countAll().as('count'))
          .execute();
        
        const count = result[0]?.count || 0;
        console.log(`  ✅ ${tableName}: ${count} records`);
      } catch (error) {
        console.log(`  ❌ ${tableName}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        allTablesExist = false;
      }
    }
    
    if (!allTablesExist) {
      console.log('❌ Some required tables are missing');
      return false;
    }
    
    console.log('✅ Startup check completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Startup check failed:', error);
    console.error('🔍 This is likely the database issue you are experiencing');
    return false;
  }
}
