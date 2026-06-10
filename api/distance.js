export default async function handler(req, res) {
  const { destination } = req.query;
  if (!destination) {
    return res.status(400).json({ error: 'destination required' });
  }

  const key = process.env.MAPS_KEY;
  const origin = 'Rua de Santa Justa, 4705-353 Braga, Portugal';
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&region=pt&key=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
