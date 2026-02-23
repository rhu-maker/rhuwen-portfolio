const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./portfolio.db');

db.run("UPDATE testimonials SET approved = 1", function(err) {
    if (err) {
        return console.error("❌ Error: " + err.message);
    }
    console.log(`✅ Success! Updated ${this.changes} testimonials.`);
});

db.close();