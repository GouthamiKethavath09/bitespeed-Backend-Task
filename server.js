const express = require('express');
const bodyParser = require('body-parser');
const { init } = require('./db.js');
const identify = require('./contactService.js');

const app = express();
const PORT = process.env.PORT || 3000;

init();
app.use(bodyParser.json());

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
