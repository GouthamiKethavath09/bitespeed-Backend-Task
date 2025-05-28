const Database = require('better-sqlite3');
const db = new Database('db.sqlite');

function init() {
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    db.exec(schema, (err) => {
        if (err) console.error('Schema Error:', err);
        else console.log('Database initialized.');
    });
}

module.exports = { db, init };
