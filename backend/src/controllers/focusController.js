const env = require('../config/env');
const { buildAiInsights } = require('../services/aiService');
const { buildReport } = require('../services/reportService');

function calculateFocusScore(durationSeconds, distractionCount, goalMinutes) {
  const goalSeconds = goalMinutes * 60;
  const completionRatio = Math.min(durationSeconds / Math.max(goalSeconds, 1), 1.25);
  const rawScore = 55 + completionRatio * 35 - distractionCount * 8;
  return Math.max(5, Math.min(100, Number(rawScore.toFixed(1))));
}

async function startFocus(req, res, next) {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const goalMinutes = Number(req.body.goalMinutes || 25);

    const activeSession = await db.get(
      'SELECT id FROM focus_sessions WHERE user_id = ? AND status = ?',
      req.user.id,
      'active'
    );

    if (activeSession) {
      return res.status(409).json({ message: 'A focus session is already active.' });
    }

    const startedAt = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO focus_sessions (user_id, goal_minutes, started_at, status) VALUES (?, ?, ?, ?)',
      req.user.id,
      goalMinutes,
      startedAt,
      'active'
    );

    const session = await db.get('SELECT * FROM focus_sessions WHERE id = ?', result.lastID);
    io.to(`user:${req.user.id}`).emit('focus:update', { type: 'started', session });

    res.status(201).json({
      message: 'Focus session started.',
      session
    });
  } catch (error) {
    next(error);
  }
}

async function stopFocus(req, res, next) {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');

    const session = await db.get(
      'SELECT * FROM focus_sessions WHERE user_id = ? AND status = ?',
      req.user.id,
      'active'
    );

    if (!session) {
      return res.status(404).json({ message: 'No active focus session found.' });
    }

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.round((new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 1000)
    );

    const focusScore = calculateFocusScore(durationSeconds, session.distraction_count, session.goal_minutes);

    await db.run(
      `UPDATE focus_sessions
       SET ended_at = ?, duration_seconds = ?, status = ?, focus_score = ?
       WHERE id = ?`,
      endedAt,
      durationSeconds,
      'completed',
      focusScore,
      session.id
    );

    const updatedSession = await db.get('SELECT * FROM focus_sessions WHERE id = ?', session.id);
    io.to(`user:${req.user.id}`).emit('focus:update', { type: 'stopped', session: updatedSession });

    res.json({
      message: 'Focus session stopped.',
      session: updatedSession
    });
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const db = req.app.get('db');
    const userId = req.user.id;

    const sessionSummary = await db.get(
      `SELECT
         COUNT(*) AS totalSessions,
         COALESCE(SUM(duration_seconds), 0) AS totalFocusSeconds,
         COALESCE(AVG(duration_seconds), 0) AS averageSessionSeconds,
         COALESCE(AVG(focus_score), 0) AS averageFocusScore
       FROM focus_sessions
       WHERE user_id = ? AND status = 'completed'`,
      userId
    );

    const distractionSummary = await db.get(
      `SELECT COUNT(*) AS totalDistractions
       FROM distraction_events
       WHERE user_id = ?`,
      userId
    );

    const activeSession = await db.get(
      'SELECT * FROM focus_sessions WHERE user_id = ? AND status = ?',
      userId,
      'active'
    );

    const recentAlerts = await db.all(
      `SELECT id, event_type, intensity, source, notes, created_at
       FROM distraction_events
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      userId
    );

    const telemetry = await db.all(
      `SELECT ir_detected, led_mode, vibration_active, oled_status, focus_level, created_at
       FROM device_events
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      userId
    );

    const report = await buildReport(db, userId, 7);
    const sessions = await db.all(
      `SELECT started_at, duration_seconds, distraction_count, focus_score
       FROM focus_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY started_at DESC
       LIMIT 30`,
      userId
    );

    const metrics = {
      distractionRate: sessionSummary.totalSessions ? distractionSummary.totalDistractions / sessionSummary.totalSessions : 0,
      completionRate: activeSession ? 0.55 : 0.82,
      consistency: Math.min(report.length / 7, 1),
      averageFocusMinutes: sessionSummary.averageSessionSeconds / 60,
      daySessions: sessions.filter((session) => new Date(session.started_at).getHours() < 18).length,
      nightSessions: sessions.filter((session) => new Date(session.started_at).getHours() >= 18).length
    };

    const aiInsights = await buildAiInsights(metrics, env);

    res.json({
      summary: {
        totalSessions: sessionSummary.totalSessions,
        totalFocusMinutes: Math.round(sessionSummary.totalFocusSeconds / 60),
        averageSessionMinutes: Math.round(sessionSummary.averageSessionSeconds / 60),
        totalDistractions: distractionSummary.totalDistractions,
        averageFocusScore: Number(sessionSummary.averageFocusScore.toFixed(1))
      },
      activeSession,
      recentAlerts,
      telemetry,
      report,
      aiInsights
    });
  } catch (error) {
    next(error);
  }
}

async function ingestDeviceEvent(req, res, next) {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const {
      userId,
      irDetected = false,
      ledMode = 'idle',
      vibrationActive = false,
      oledStatus = 'idle',
      focusLevel = 0,
      distraction = false,
      distractionIntensity = 1,
      distractionNote = ''
    } = req.body;

    await db.run(
      `INSERT INTO device_events (user_id, ir_detected, led_mode, vibration_active, oled_status, focus_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      userId || null,
      irDetected ? 1 : 0,
      ledMode,
      vibrationActive ? 1 : 0,
      oledStatus,
      Number(focusLevel || 0)
    );

    if (userId) {
      const latestTelemetry = await db.get(
        `SELECT ir_detected, led_mode, vibration_active, oled_status, focus_level, created_at
         FROM device_events
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        userId
      );

      io.to(`user:${userId}`).emit('device:telemetry', latestTelemetry);

      if (distraction) {
        const activeSession = await db.get(
          'SELECT * FROM focus_sessions WHERE user_id = ? AND status = ?',
          userId,
          'active'
        );

        if (activeSession) {
          await db.run(
            `INSERT INTO distraction_events (session_id, user_id, event_type, intensity, source, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            activeSession.id,
            userId,
            'distraction_detected',
            distractionIntensity,
            'esp32',
            distractionNote || 'IR sensor detected a distraction pattern.'
          );

          await db.run(
            'UPDATE focus_sessions SET distraction_count = distraction_count + 1 WHERE id = ?',
            activeSession.id
          );

          const alert = await db.get(
            `SELECT id, event_type, intensity, source, notes, created_at
             FROM distraction_events
             WHERE session_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            activeSession.id
          );

          io.to(`user:${userId}`).emit('alert:new', alert);
        }
      }
    }

    res.status(201).json({ message: 'Device event stored.' });
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const db = req.app.get('db');
    const days = Number(req.query.days || 7);
    const report = await buildReport(db, req.user.id, days);
    res.json({ report });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startFocus,
  stopFocus,
  getStats,
  ingestDeviceEvent,
  getReports
};
