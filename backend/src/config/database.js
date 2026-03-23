const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { readFile } = require('fs/promises');

async function connectDatabase() {
  const databaseFile = path.resolve(__dirname, '../../nyrocube.db');
  const db = await open({
    filename: databaseFile,
    driver: sqlite3.Database
  });

  const schema = await readFile(path.resolve(__dirname, '../db/init.sql'), 'utf8');
  await db.exec(schema);
  return db;
}

module.exports = { connectDatabase };
