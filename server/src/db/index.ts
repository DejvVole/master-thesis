import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

import * as dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL;
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432;
const database = process.env.DB_NAME || 'building_rag';
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;

if (!databaseUrl && (!user || !password)) {
  throw new Error('Database configuration is not properly defined in environment variables');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: host,
  port: port,
  database: database,
  user: user,
  password: password,
});

export const db = drizzle(pool, { schema });