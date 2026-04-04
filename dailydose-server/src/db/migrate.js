const fs = require('fs')
const path = require('path')
const pool = require('./index')

const runMigration = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    await pool.query(sql)
    console.log('Database schema created successfully ✅')
    process.exit(0)
  } catch (err) {
    console.error('Migration error:', err.message)
    process.exit(1)
  }
}

runMigration()