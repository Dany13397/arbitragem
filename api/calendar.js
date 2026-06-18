import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://adswzjlhxxkqqhdhjodo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkc3d6amxoeHhrcXFoZGhqb2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTk1NTgsImV4cCI6MjA5NjQ5NTU1OH0.x4R7Pev8rQmYzUKmnV4kwaZGJgyDiuolt47kN1FPjx0';

function escapeIcs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Fold long lines per RFC 5545 (max 75 octets)
function foldLine(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let offset = 0;
  // First line: 75 bytes
  let chunk = '';
  let byteCount = 0;
  for (const char of line) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    if (byteCount + charBytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(chunk);
      chunk = char;
      byteCount = charBytes;
    } else {
      chunk += char;
      byteCount += charBytes;
    }
  }
  if (chunk) parts.push(chunk);
  return parts.join('\r\n ');
}

function toIcsDate(dateStr, timeStr) {
  // dateStr: DD/MM/YYYY, timeStr: HH:MM
  const [day, month, year] = dateStr.split('/');
  const [hour, minute] = timeStr.split(':');
  return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}T${hour.padStart(2, '0')}${minute.padStart(2, '0')}00`;
}

function addMinutes(icsDatetime, minutes) {
  const year = parseInt(icsDatetime.slice(0, 4));
  const month = parseInt(icsDatetime.slice(4, 6)) - 1;
  const day = parseInt(icsDatetime.slice(6, 8));
  const hour = parseInt(icsDatetime.slice(9, 11));
  const min = parseInt(icsDatetime.slice(11, 13));
  const d = new Date(Date.UTC(year, month, day, hour, min));
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

function buildEvent(game) {
  const dtstart = toIcsDate(game.date, game.time || '00:00');
  const dtend = addMinutes(dtstart, 90); // ~90 min match

  const summary = `[${game.competition}] ${game.home_team} vs ${game.away_team}`;
  const location = [game.venue, game.location].filter(Boolean).join(', ');
  const description = [
    `Competição: ${game.competition || ''}`,
    `Função: ${game.my_role || ''}`,
    game.km ? `Distância: ${game.km} km` : '',
    game.total ? `Prémio total: €${Number(game.total).toFixed(2)}` : '',
  ].filter(Boolean).join('\\n');

  const uid = `arbitragem-${game.id || game.game_id}@dany-arbitro`;

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${addMinutes(new Date().toISOString().replace(/[-:]/g, '').slice(0, 15), 0)}Z`,
    `DTSTART;TZID=Europe/Lisbon:${dtstart}`,
    `DTEND;TZID=Europe/Lisbon:${dtend}`,
    foldLine(`SUMMARY:${escapeIcs(summary)}`),
    foldLine(`LOCATION:${escapeIcs(location)}`),
    foldLine(`DESCRIPTION:${description}`),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Enviar resultado do jogo',
    'TRIGGER:+PT2H',
    'END:VALARM',
    'END:VEVENT',
  ];

  return lines.join('\r\n');
}

export default async function handler(req, res) {
  // Allow iOS calendar to subscribe
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="arbitragem.ics"');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: games, error } = await db
      .from('nomeacoes')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    const events = (games || []).map(buildEvent).join('\r\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Dany Garcez//Árbitro Futsal//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Árbitro Futsal',
      'X-WR-CALDESC:Jogos de árbitro futsal',
      'X-WR-TIMEZONE:Europe/Lisbon',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Lisbon',
      'BEGIN:STANDARD',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0000',
      'TZNAME:WET',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:19700329T010000',
      'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
      'TZOFFSETFROM:+0000',
      'TZOFFSETTO:+0100',
      'TZNAME:WEST',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
      events,
      'END:VCALENDAR',
    ].join('\r\n');

    res.status(200).send(ics);
  } catch (err) {
    res.status(500).send(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Error//EN\r\nEND:VCALENDAR`);
  }
}
