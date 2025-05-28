const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./database.db');
function init() {
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    db.exec(schema, (err) => {
        if (err) console.error('Schema Error:', err);
        else console.log('Database initialized.');
    });
}

module.exports = { db, init };
