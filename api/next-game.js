import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://adswzjlhxxkqqhdhjodo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkc3d6amxoeHhrcXFoZGhqb2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTk1NTgsImV4cCI6MjA5NjQ5NTU1OH0.x4R7Pev8rQmYzUKmnV4kwaZGJgyDiuolt47kN1FPjx0';

function parseDate(dateStr, timeStr) {
  const [day, month, year] = dateStr.split('/');
  const [hour, minute] = (timeStr || '00:00').split(':');
  return new Date(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${hour.padStart(2,'0')}:${minute.padStart(2,'0')}:00`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: games, error } = await db
      .from('nomeacoes')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    const now = new Date();
    const upcoming = (games || [])
      .map(g => ({ ...g, _dt: parseDate(g.date, g.time) }))
      .filter(g => g._dt >= now)
      .sort((a, b) => a._dt - b._dt);

    const next = upcoming[0] || null;

    res.status(200).json({
      next: next ? {
        id: next.id,
        competition: next.competition,
        home_team: next.home_team,
        away_team: next.away_team,
        date: next.date,
        time: next.time,
        venue: next.venue,
        location: next.location,
        my_role: next.my_role,
        total: next.total,
        km: next.km,
      } : null,
      total_upcoming: upcoming.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
