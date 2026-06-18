// Árbitro Futsal — Widget iOS (Scriptable)
// Instalar: copiar este código no app Scriptable

const API = "https://arbitragem.vercel.app/api/next-game";

const ACCENT = new Color("#4f7fff");
const BG     = new Color("#0f1117");
const SURFACE= new Color("#1a1d27");
const MUTED  = new Color("#8892b0");
const TEXT   = new Color("#e8eaf6");
const GREEN  = new Color("#22c55e");

async function fetchNext() {
  try {
    const req = new Request(API);
    req.timeoutInterval = 10;
    return await req.loadJSON();
  } catch (e) {
    return null;
  }
}

function roleColor(role) {
  if (role === "1A" || role === "2A") return new Color("#4f7fff");
  if (role === "CRON") return new Color("#f59e0b");
  return new Color("#7c3aed");
}

function daysUntil(dateStr, timeStr) {
  const [d, m, y] = dateStr.split("/");
  const [h, min]  = (timeStr || "00:00").split(":");
  const dt = new Date(`${y}-${m}-${d}T${h}:${min}:00`);
  const diff = dt - Date.now();
  if (diff < 0) return null;
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days === 0) return hours === 0 ? "Agora" : `${hours}h`;
  if (days === 1) return "Amanhã";
  return `${days} dias`;
}

async function createWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(14, 14, 14, 14);
  w.url = "https://arbitragem.vercel.app";
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  if (!data || !data.next) {
    const t = w.addText("⚽ Sem jogos próximos");
    t.textColor = MUTED;
    t.font = Font.mediumSystemFont(13);
    return w;
  }

  const g = data.next;

  // Header: competição + função
  const headerStack = w.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();

  const compText = headerStack.addText(g.competition);
  compText.textColor = MUTED;
  compText.font = Font.semiboldSystemFont(10);

  headerStack.addSpacer();

  const roleBox = headerStack.addStack();
  roleBox.backgroundColor = roleColor(g.my_role);
  roleBox.cornerRadius = 4;
  roleBox.setPadding(2, 6, 2, 6);
  const roleText = roleBox.addText(g.my_role);
  roleText.textColor = Color.white();
  roleText.font = Font.boldSystemFont(10);

  w.addSpacer(6);

  // Equipas
  const teamsText = w.addText(`${g.home_team} vs ${g.away_team}`);
  teamsText.textColor = TEXT;
  teamsText.font = Font.boldSystemFont(14);
  teamsText.minimumScaleFactor = 0.7;
  teamsText.lineLimit = 2;

  w.addSpacer(8);

  // Data + hora
  const countdown = daysUntil(g.date, g.time);
  const dateStack = w.addStack();
  dateStack.layoutHorizontally();
  dateStack.centerAlignContent();

  const dateText = dateStack.addText(`📅 ${g.date}  🕐 ${g.time}`);
  dateText.textColor = MUTED;
  dateText.font = Font.systemFont(11);

  dateStack.addSpacer();

  if (countdown) {
    const cdText = dateStack.addText(countdown);
    cdText.textColor = countdown === "Amanhã" || countdown.endsWith("h") ? GREEN : ACCENT;
    cdText.font = Font.boldSystemFont(12);
  }

  w.addSpacer(4);

  // Local
  const locText = w.addText(`📍 ${g.venue ? g.venue + ", " : ""}${g.location || ""}`);
  locText.textColor = MUTED;
  locText.font = Font.systemFont(11);
  locText.lineLimit = 1;

  w.addSpacer();

  // Total
  if (g.total) {
    const totalText = w.addText(`€${Number(g.total).toFixed(2)}`);
    totalText.textColor = GREEN;
    totalText.font = Font.boldSystemFont(13);
  }

  return w;
}

const data = await fetchNext();
const widget = await createWidget(data);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentSmall();
}
Script.complete();
