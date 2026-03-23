function startOfDayIso(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day.toISOString();
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

async function buildReport(db, userId, days = 7) {
  const today = new Date();
  const startDate = startOfDayIso(addDays(today, -(days - 1)));

  const sessions = await db.all(
    `SELECT DATE(started_at) AS session_date,
            COUNT(*) AS total_sessions,
            COALESCE(SUM(duration_seconds), 0) AS total_seconds,
            COALESCE(SUM(distraction_count), 0) AS distractions,
            ROUND(AVG(focus_score), 2) AS average_focus_score
     FROM focus_sessions
     WHERE user_id = ? AND started_at >= ?
     GROUP BY DATE(started_at)
     ORDER BY session_date ASC`,
    userId,
    startDate
  );

  return sessions;
}

module.exports = { buildReport };
