import express from 'express';
import { json } from 'body-parser';
import { init } from './db.js';
import identify from './contactService.js';

const app = express();
const PORT = process.env.PORT || 3000;

init();
app.use(json());

app.post('/identify', async (req, res) => {
    try {
        const result = await identify(req.body);
        res.status(200).json({ contact: result });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
