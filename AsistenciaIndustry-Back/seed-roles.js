import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  console.log("Connected to db");
  
  // Create table if it doesn't exist
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS events;
    CREATE TABLE IF NOT EXISTS events.roles (
      name text PRIMARY KEY,
      description text,
      permissions jsonb DEFAULT '[]',
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
  `);
  
  // Insert the operator role
  await client.query(`
    INSERT INTO events.roles (name, description, permissions) 
    VALUES ('operator', 'Operador del sistema', '[]')
    ON CONFLICT (name) DO NOTHING;
  `);
  console.log("Inserted operator role");
  
  await client.end();
}

main().catch(console.error);
