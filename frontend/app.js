const apiBase = '/api';
const state = {
  token: localStorage.getItem('nyrocubeToken') || '',
  user: JSON.parse(localStorage.getItem('nyrocubeUser') || 'null'),
  activeSession: null,
  timerInterval: null,
  focusTrendChart: null,
  distractionChart: null,
  socket: null
};

const elements = {
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  authFeedback: document.getElementById('authFeedback'),
  actionFeedback: document.getElementById('actionFeedback'),
  logoutButton: document.getElementById('logoutButton'),
  userName: document.getElementById('userName'),
  userEmail: document.getElementById('userEmail'),
  focusTimer: document.getElementById('focusTimer'),
  goalText: document.getElementById('goalText'),
  totalFocusMinutes: document.getElementById('totalFocusMinutes'),
  totalDistractions: document.getElementById('totalDistractions'),
  averageFocusScore: document.getElementById('averageFocusScore'),
  alertsList: document.getElementById('alertsList'),
  telemetryList: document.getElementById('telemetryList'),
  aiSummary: document.getElementById('aiSummary'),
  aiRecommendations: document.getElementById('aiRecommendations'),
  startButton: document.getElementById('startButton'),
  stopButton: document.getElementById('stopButton'),
  goalMinutes: document.getElementById('goalMinutes'),
  deviceState: document.getElementById('deviceState'),
  sessionState: document.getElementById('sessionState'),
  aiMode: document.getElementById('aiMode')
};

function formatDuration(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

function persistAuth(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('nyrocubeToken', token);
  localStorage.setItem('nyrocubeUser', JSON.stringify(user));
  renderUser();
  connectSocket();
}

function clearAuth() {
  state.user = null;
  state.token = '';
  state.activeSession = null;
  localStorage.removeItem('nyrocubeToken');
  localStorage.removeItem('nyrocubeUser');
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
  stopTimer();
  renderUser();
  resetDashboard();
}

function renderUser() {
  if (state.user) {
    elements.userName.textContent = state.user.full_name || state.user.fullName || 'NyroCube User';
    elements.userEmail.textContent = state.user.email;
    elements.logoutButton.classList.remove('hidden');
  } else {
    elements.userName.textContent = 'Guest User';
    elements.userEmail.textContent = 'Login required';
    elements.logoutButton.classList.add('hidden');
  }
}

function startTimer(startedAt) {
  stopTimer();
  const tick = () => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    elements.focusTimer.textContent = formatDuration(seconds);
  };
  tick();
  state.timerInterval = window.setInterval(tick, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  if (!state.activeSession) {
    elements.focusTimer.textContent = '00:00:00';
  }
}

function renderAlerts(alerts) {
  if (!alerts?.length) {
    elements.alertsList.innerHTML = '<div class="alert-item">No distraction alerts yet.</div>';
    return;
  }

  elements.alertsList.innerHTML = alerts.map((alert) => `
    <div class="alert-item">
      <strong>${alert.event_type.replaceAll('_', ' ')}</strong>
      <div class="muted small-text">${alert.notes || 'NyroCube detected a distraction pattern.'}</div>
      <div class="muted small-text">${formatDateTime(alert.created_at)} | Intensity ${alert.intensity}</div>
    </div>
  `).join('');
}

function renderTelemetry(items) {
  if (!items?.length) {
    elements.telemetryList.innerHTML = '<div class="telemetry-item">No telemetry received yet.</div>';
    elements.deviceState.textContent = 'Awaiting telemetry';
    return;
  }

  const latest = items[0];
  elements.deviceState.textContent = `${latest.led_mode} | focus level ${Number(latest.focus_level).toFixed(2)}`;
  elements.telemetryList.innerHTML = items.map((item) => `
    <div class="telemetry-item">
      <strong>${item.led_mode.toUpperCase()}</strong>
      <div class="muted small-text">IR: ${item.ir_detected ? 'Detected' : 'Clear'} | Vibration: ${item.vibration_active ? 'On' : 'Off'}</div>
      <div class="muted small-text">OLED: ${item.oled_status} | Focus level: ${Number(item.focus_level).toFixed(2)}</div>
      <div class="muted small-text">${formatDateTime(item.created_at)}</div>
    </div>
  `).join('');
}

function renderAiInsights(aiInsights) {
  elements.aiMode.textContent = `${aiInsights.mode} analysis active`;
  elements.aiSummary.textContent = aiInsights.summary;
  elements.aiRecommendations.innerHTML = (aiInsights.recommendations || [])
    .map((item) => `<div class="recommendation-item">${item}</div>`)
    .join('');
}

function renderCharts(report, summary) {
  if (typeof Chart === 'undefined') {
    return;
  }

  const labels = report.map((item) => item.session_date);
  const totalMinutes = report.map((item) => Math.round((item.total_seconds || 0) / 60));

  if (state.focusTrendChart) {
    state.focusTrendChart.destroy();
  }

  state.focusTrendChart = new Chart(document.getElementById('focusTrendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Focus Minutes',
        data: totalMinutes,
        borderColor: '#87f0d6',
        backgroundColor: 'rgba(135, 240, 214, 0.15)',
        borderWidth: 3,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#f6f7f2' } } },
      scales: {
        x: { ticks: { color: '#a7b8bf' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#a7b8bf' }, grid: { color: 'rgba(255,255,255,0.06)' } }
      }
    }
  });

  if (state.distractionChart) {
    state.distractionChart.destroy();
  }

  state.distractionChart = new Chart(document.getElementById('distractionChart'), {
    type: 'doughnut',
    data: {
      labels: ['Distractions', 'Completed Sessions'],
      datasets: [{
        data: [summary.totalDistractions || 0, summary.totalSessions || 0],
        backgroundColor: ['#ff6f61', '#f0a14f'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#f6f7f2' } } }
    }
  });
}

function updateSessionUi(activeSession) {
  state.activeSession = activeSession;
  if (activeSession) {
    elements.sessionState.textContent = `Focus live | ${activeSession.goal_minutes} min goal`;
    elements.goalText.textContent = `Goal: ${activeSession.goal_minutes} minutes`;
    startTimer(activeSession.started_at);
  } else {
    elements.sessionState.textContent = 'No active focus sprint';
    elements.goalText.textContent = 'Set a goal and begin your sprint.';
    stopTimer();
  }
}

function resetDashboard() {
  elements.totalFocusMinutes.textContent = '0 min';
  elements.totalDistractions.textContent = '0';
  elements.averageFocusScore.textContent = '0.0';
  elements.aiSummary.textContent = 'Sign in to generate recommendations from your focus pattern history.';
  elements.aiRecommendations.innerHTML = '';
  renderAlerts([]);
  renderTelemetry([]);
  updateSessionUi(null);
  elements.aiMode.textContent = 'Local analysis ready';
}

async function refreshDashboard() {
  if (!state.token) {
    resetDashboard();
    return;
  }

  const stats = await request('/focus/getStats');
  elements.totalFocusMinutes.textContent = `${stats.summary.totalFocusMinutes} min`;
  elements.totalDistractions.textContent = stats.summary.totalDistractions;
  elements.averageFocusScore.textContent = stats.summary.averageFocusScore.toFixed(1);
  renderAlerts(stats.recentAlerts);
  renderTelemetry(stats.telemetry);
  renderAiInsights(stats.aiInsights);
  renderCharts(stats.report, stats.summary);
  updateSessionUi(stats.activeSession);
}

function connectSocket() {
  if (!state.token || typeof io === 'undefined') {
    return;
  }

  if (state.socket) {
    state.socket.disconnect();
  }

  state.socket = io();
  state.socket.on('connect', () => {
    state.socket.emit('join-room', { token: state.token });
  });

  state.socket.on('focus:update', ({ session, type }) => {
    updateSessionUi(type === 'stopped' ? null : session);
    elements.actionFeedback.textContent = type === 'started'
      ? 'Focus session started. NyroCube is now tracking your sprint.'
      : 'Focus session stopped and saved.';
    refreshDashboard().catch((error) => { elements.actionFeedback.textContent = error.message; });
  });

  state.socket.on('device:telemetry', () => { refreshDashboard().catch(() => {}); });
  state.socket.on('alert:new', (alert) => {
    elements.actionFeedback.textContent = `Distraction detected at ${formatDateTime(alert.created_at)}.`;
    refreshDashboard().catch(() => {});
  });
}

document.querySelectorAll('[data-auth-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-auth-tab]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const tab = button.dataset.authTab;
    elements.loginForm.classList.toggle('hidden', tab !== 'login');
    elements.signupForm.classList.toggle('hidden', tab !== 'signup');
  });
});

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  try {
    const payload = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    persistAuth(payload.user, payload.token);
    elements.authFeedback.textContent = 'Login successful. Your dashboard is ready.';
    await refreshDashboard();
  } catch (error) {
    elements.authFeedback.textContent = error.message;
  }
});

elements.signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  try {
    const payload = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    persistAuth(payload.user, payload.token);
    elements.authFeedback.textContent = 'Account created. Welcome to NyroCube.';
    await refreshDashboard();
  } catch (error) {
    elements.authFeedback.textContent = error.message;
  }
});

elements.startButton.addEventListener('click', async () => {
  try {
    const payload = await request('/focus/startFocus', {
      method: 'POST',
      body: JSON.stringify({ goalMinutes: Number(elements.goalMinutes.value || 25) })
    });
    elements.actionFeedback.textContent = payload.message;
    updateSessionUi(payload.session);
    await refreshDashboard();
  } catch (error) {
    elements.actionFeedback.textContent = error.message;
  }
});

elements.stopButton.addEventListener('click', async () => {
  try {
    const payload = await request('/focus/stopFocus', { method: 'POST' });
    elements.actionFeedback.textContent = payload.message;
    updateSessionUi(null);
    await refreshDashboard();
  } catch (error) {
    elements.actionFeedback.textContent = error.message;
  }
});

elements.logoutButton.addEventListener('click', () => {
  clearAuth();
  elements.authFeedback.textContent = 'You have been logged out.';
});

renderUser();
resetDashboard();
if (state.token) {
  connectSocket();
  refreshDashboard().catch((error) => {
    clearAuth();
    elements.authFeedback.textContent = error.message;
  });
}
