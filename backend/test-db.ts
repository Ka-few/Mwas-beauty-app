import { initializeDB } from './db/database';

async function testDB() {
  try {
    const db = await initializeDB();
    console.log('Database initialized successfully.');

    // Check tables
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table';`);
    console.log('Tables in DB:', tables);

    await db.close();
  } catch (err) {
    console.error('Error initializing DB:', err);
  }
}

testDB();
