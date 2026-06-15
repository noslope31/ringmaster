import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// Parse JSON payloads up to 50MB (supporting large image uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Endpoint to retrieve inventory and logs data
app.get('/api/data', async (req, res) => {
  try {
    try {
      await fs.access(DB_PATH);
    } catch {
      // If db.json doesn't exist, return empty collections
      return res.json({ inventory: [], logs: [] });
    }

    const fileContent = await fs.readFile(DB_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    res.json({
      inventory: data.inventory || [],
      logs: data.logs || [],
    });
  } catch (error) {
    console.error('Error reading database:', error);
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// Endpoint to save inventory and logs data
app.post('/api/data', async (req, res) => {
  try {
    const { inventory, logs } = req.body;

    if (!Array.isArray(inventory) || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'Invalid data format. Expected inventory and logs arrays.' });
    }

    const dataToSave = {
      inventory,
      logs,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(DB_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing database:', error);
    res.status(500).json({ error: 'Failed to write database' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Backend] Server listening on http://0.0.0.0:${PORT}`);
});
