function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildLocalRecommendation(metrics) {
  const distractionPenalty = metrics.distractionRate * 16;
  const completionBoost = metrics.completionRate * 20;
  const consistencyBoost = metrics.consistency * 18;
  const averageFocusBoost = (metrics.averageFocusMinutes / 60) * 20;
  const score = clamp(50 + completionBoost + consistencyBoost + averageFocusBoost - distractionPenalty, 10, 99);

  const recommendations = [];

  if (metrics.distractionRate > 1.8) {
    recommendations.push('Enable stronger vibration nudges after repeated distractions to recover attention faster.');
  }

  if (metrics.averageFocusMinutes < 20) {
    recommendations.push('Try shorter 20-minute deep-work sprints with a 5-minute reset between sessions.');
  }

  if (metrics.consistency < 0.45) {
    recommendations.push('Schedule focus sessions at the same time daily so the cube can build a steadier pattern baseline.');
  }

  if (metrics.nightSessions > metrics.daySessions) {
    recommendations.push('Most sessions happen later in the day; test an earlier study block and compare your focus score trend.');
  }

  if (!recommendations.length) {
    recommendations.push('Your focus rhythm is stable. Increase session goals by 5 minutes this week to keep improving gradually.');
  }

  return {
    mode: 'local',
    focusScorePrediction: Number(score.toFixed(1)),
    summary: 'NyroCube sees your recent pattern as moderately strong with room for tighter distraction recovery.',
    recommendations
  };
}

async function buildAiInsights(metrics, env) {
  if (env.aiMode !== 'external' || !env.openAiKey) {
    return buildLocalRecommendation(metrics);
  }

  try {
    const prompt = [
      'You are an AI productivity coach for the NyroCube smart focus dashboard.',
      'Return strict JSON with keys: summary, focusScorePrediction, recommendations.',
      `Metrics: ${JSON.stringify(metrics)}`
    ].join('\n');

    const response = await fetch(`${env.openAiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openAiKey}`
      },
      body: JSON.stringify({
        model: env.openAiModel,
        messages: [
          { role: 'system', content: 'Return compact JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`AI provider error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      mode: 'external',
      focusScorePrediction: parsed.focusScorePrediction,
      summary: parsed.summary,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };
  } catch (error) {
    console.warn('External AI failed, falling back to local insights.', error.message);
    return buildLocalRecommendation(metrics);
  }
}

module.exports = { buildAiInsights };
