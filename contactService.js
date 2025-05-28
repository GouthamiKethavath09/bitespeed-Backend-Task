import { db } from './db';

const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const runInsert = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
};

const getCurrentTime = () => new Date().toISOString();

async function identify({ email, phoneNumber }) {
    if (!email && !phoneNumber) throw new Error("email or phoneNumber is required");

    // Step 1: Find all contacts where either email or phoneNumber matches
    const contacts = await runQuery(
        `SELECT * FROM Contact WHERE email = ? OR phoneNumber = ?`,
        [email, phoneNumber]
    );

    // Step 2: Build the union of related contacts
    const allIds = new Set();
    contacts.forEach(c => {
        allIds.add(c.id);
        if (c.linkedId) allIds.add(c.linkedId);
    });

    const related = allIds.size > 0
        ? await runQuery(
            `SELECT * FROM Contact WHERE id IN (${Array.from(allIds).join(",")}) OR linkedId IN (${Array.from(allIds).join(",")})`
        )
        : [];

    let primary = null;
    for (const c of related) {
        if (c.linkPrecedence === 'primary') {
            if (!primary || new Date(c.createdAt) < new Date(primary.createdAt)) {
                primary = c;
            }
        }
    }

    // Step 3: Determine if a new contact needs to be created
    let foundEmail = related.find(c => c.email === email);
    let foundPhone = related.find(c => c.phoneNumber === phoneNumber);

    let newContact = null;
    if (!foundEmail || !foundPhone) {
        // Create new secondary contact linked to primary
        if (!primary && contacts.length > 0) {
            primary = contacts[0];
        }

        const now = getCurrentTime();
        const linkPrecedence = primary ? 'secondary' : 'primary';
        const linkedId = primary ? primary.id : null;

        newContact = await runInsert(
            `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [email, phoneNumber, linkedId, linkPrecedence, now, now]
        );

        // Refresh contacts
        return await identify({ email, phoneNumber });
    }

    // Step 4: Check for conflicting primaries (merge)
    const primaries = related.filter(c => c.linkPrecedence === 'primary');
    if (primaries.length > 1) {
        const oldest = primaries.reduce((a, b) =>
            new Date(a.createdAt) < new Date(b.createdAt) ? a : b
        );

        for (const p of primaries) {
            if (p.id !== oldest.id) {
                await runInsert(
                    `UPDATE Contact SET linkedId = ?, linkPrecedence = 'secondary', updatedAt = ? WHERE id = ?`,
                    [oldest.id, getCurrentTime(), p.id]
                );
            }
        }

        return await identify({ email, phoneNumber });
    }

    // Step 5: Build final response
    const finalContacts = await runQuery(
        `SELECT * FROM Contact WHERE id = ? OR linkedId = ?`,
        [primary.id, primary.id]
    );

    const emails = [...new Set(finalContacts.map(c => c.email).filter(Boolean))];
    const phoneNumbers = [...new Set(finalContacts.map(c => c.phoneNumber).filter(Boolean))];
    const secondaryIds = finalContacts
        .filter(c => c.linkPrecedence === 'secondary')
        .map(c => c.id);

    return {
        primaryContatctId: primary.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaryIds
    };
}

export default identify;
