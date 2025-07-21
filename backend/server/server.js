// ───────────────────────────────────────────────
//  backend/server/server.js
// ───────────────────────────────────────────────
import express  from 'express';
import cors     from 'cors';
import {
  openDb,
  getRoutes,
  getTrips,
  getShapes,
  getStops
} from 'gtfs';
import sqlite3 from 'sqlite3';

// 1️⃣  DB init
await openDb({ sqlitePath: './data/ratbv.db' });
const db = new sqlite3.Database('./data/ratbv.db');

// 2️⃣  Express
const app  = express();
const PORT = 3001;
app.use(cors());

/*───────────────────────────────────────────────
  GET /api/routes  →  toate rutele
───────────────────────────────────────────────*/
app.get('/api/routes', async (_, res) => {
  try {
    const routes = await getRoutes({});        // toate rutele
    const slim   = routes.map(r => ({
      route_id         : r.route_id,
      route_short_name : r.route_short_name,
      route_long_name  : r.route_long_name
    }));
    res.json(slim);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'GTFS routes error' });
  }
});

/*───────────────────────────────────────────────
  GET /api/route/:id  →  shape + staţii (o direcţie)
───────────────────────────────────────────────*/
app.get('/api/route/:id', async (req, res) => {
  const routeId = req.params.id;

  try {
    // 1. Toate cursele („trips”) ale rutei
    const trips = await getTrips({ route_id: routeId });
    if (!trips.length) return res.json({ shapes: [], stops: [] });

    // 2. Cel mai frecvent / lung shape_id
    const freq = {};
    trips.forEach(t => (freq[t.shape_id] = (freq[t.shape_id] || 0) + 1));
    const [bestShapeId] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

    // 3. Punctele shape‑ului
    const shapes = await getShapes({ shape_id: bestShapeId });
    shapes.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);

    // 4. Staţiile în ordinea traseului (folosim stop_times via SQLite)
    const sampleTrip = trips.find(t => t.shape_id === bestShapeId);
    const stopTimes  = await getStopTimes(sampleTrip.trip_id);  // funcţia custom de mai jos

    const stopIds = stopTimes.map(t => t.stop_id);
    const stops   = await getStops({ stop_id: stopIds });

    res.json({ shapes, stops });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'GTFS query error' });
  }
});

// helper SQL pur pentru stop_times (în ordine)
function getStopTimes(tripId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM stop_times WHERE trip_id = ? ORDER BY stop_sequence`,
      [tripId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

/*───────────────────────────────────────────────*/
app.listen(PORT, () =>
  console.log(`✅  GTFS API rulează la http://localhost:${PORT}`)
);
