import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';

// Lazy initialization for pool and db
let _pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/insights_engine';
    const requiresSSL = connectionString.includes('sslmode=require') || connectionString.includes('db.prisma.io');

    console.log('🔌 Database URL:', connectionString.replace(/:[^:@]+@/, ':****@'));
    console.log('🔒 SSL enabled:', requiresSSL);

    _pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: requiresSSL ? true : undefined,
    });
  }
  return _pool;
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// Export lazy getters - these return the actual pool/db instances
export const pool = getPool;
export const db = getDb;

// Test connection
export async function testConnection() {
  try {
    const client = await getPool().connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
