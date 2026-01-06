import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';


export async function initializeDB() {
const db = await open({
filename: path.join(__dirname, 'salon.db'),
driver: sqlite3.Database
});


// Run schema
const schema = path.join(__dirname, 'schema.sql');
const fs = require('fs');
const sql = fs.readFileSync(schema, 'utf8');


await db.exec(sql);


console.log('SQLite DB initialized successfully');
return db;
}