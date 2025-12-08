import { defineConfig } from 'drizzle-kit';
import * as fs from 'fs';
import * as path from 'path';

// Manually parse .env file since dotenv doesn't work reliably with drizzle-kit
function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '.env');
  const env: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex);
          const value = trimmed.substring(eqIndex + 1);
          env[key] = value;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const connectionString = env.DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insights_engine';
const requiresSSL = connectionString.includes('sslmode=require') || connectionString.includes('db.prisma.io');

console.log('Drizzle config using:', connectionString.replace(/:[^:@]+@/, ':****@'));
console.log('SSL enabled:', requiresSSL);

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
    ssl: requiresSSL,
  },
  verbose: true,
  strict: true,
});
