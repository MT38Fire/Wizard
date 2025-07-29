import mysql from 'mysql2/promise';

const db = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: 'Porygon2!', // password di sql
  database: 'wizard',
  waitForConnections: true,
  queueLimit: 0
});

export default db;