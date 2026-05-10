const Anthropic = require('@anthropic-ai/sdk');

function isAIAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const PCT_ELEMENTS = [
  { n:1,  title:"Communicate a Compelling Change Narrative", quadrant:"ASPIRATION",    shifts:["Narrative over Data","Aspiration over Anxiety","Resonance over Reasoning","Consistency over Spontaneity"] },
  { n:2,  title:"Act to Think Differently",                  quadrant:"ASPIRATION",    shifts:["Action over Analysis","Modeling over Mandating","Experimentation over Execution","Vulnerability over Authority"] },
  { n:3,  title:"Embrace Situational Humility",              quadrant:"ALIGNMENT",     shifts:["Questions over Answers","Learning over Knowing","Curiosity over Certainty","Invitation over Direction"] },
  { n:4,  title:"Focus Attention on What Matters",           quadrant:"ALIGNMENT",     shifts:["Vital Few over Trivial Many","Depth over Breadth","No over Yes","Clarity over Comprehensiveness"] },
  { n:5,  title:"Motivate Discretionary Effort",             quadrant:"AUTONOMY",      shifts:["Intrinsic over Extrinsic","Meaning over Compliance","Autonomy over Direction","Recognition over Reward"] },
  { n:6,  title:"Give Others Agency",                        quadrant:"AUTONOMY",      shifts:["Trust over Control","Permission over Approval","Accountability over Oversight","Ownership over Assignment"] },
  { n:7,  title:"Decentralize Decision Making",              quadrant:"ACCOUNTABILITY",shifts:["Distributed over Centralized","Context over Commands","Guidance over Gatekeeping","Speed over Perfection"] },
  { n:8,  title:"Catalyze the Network",                      quadrant:"ACCOUNTABILITY",shifts:["Network over Hierarchy","Collaboration over Silos","Emergence over Assignment","Broker over Director"] },
  { n:9,  title:"Lead the System",                           quadrant:"ACCOUNTABILITY",shifts:["Whole over Parts","Interdependence over Independence","Collective over Individual","Adaptive over Predictive"] },
  { n:10, title:"Nudge the Culture",                         quadrant:"ALIGNMENT",     shifts:["Norms over Rules","Behaviors over Beliefs","Informal over Formal","Continuous over Episodic"] }
];

function quadrantAvg(scores, quadrant) {
  const indices = PCT_ELEMENTS
    .map((e, i) => e.quadrant === quadrant ? i : -1)
    .filter(i => i >= 0);
  const vals = indices.map(i => scores[i]).filter(v => v !== null && v !== undefined);
  if (!vals.length) return 0;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}

function buildIndividualPrompt(response, cohortName) {
  const scores = JSON.parse(response.scores || '[]');
  const ranking = JSON.parse(response.ranking || '[]');
  const activators = JSON.parse(response.activators || '{}');
  const priority = response.priority;

  const avg = scores.length
    ? (scores.filter(Boolean).reduce((a, b) => a + b, 0) / scores.filter(Boolean).length).toFixed(2)
    : 0;

  const scoresBlock = PCT_ELEMENTS.map((el, i) =>
    `PCT ${el.n} — ${el.title}: ${scores[i] ?? 'N/A'}/7`
  ).join('\n');

  const priorityEl = priority !== null && priority !== undefined ? PCT_ELEMENTS[priority] : null;

  const rankedBlock = priorityEl ? ranking.map((shiftIdx, rank) => {
    const shiftLabel = (priorityEl.shifts || [])[shiftIdx];
    return shiftLabel ? `${rank + 1}. ${shiftLabel}` : null;
  }).filter(Boolean).join('\n') : 'N/A';

  const topShiftIdx = ranking.length > 0 ? ranking[0] : null;
  const mbd = (topShiftIdx !== null && topShiftIdx !== undefined) ? (activators[topShiftIdx] || {}) : {};
  const topShiftLabel = priorityEl && topShiftIdx !== null ? (priorityEl.shifts || [])[topShiftIdx] : null;

  const activatorBlock = topShiftLabel ? `
MBD ACTIVATORS for top-ranked shift: ${topShiftLabel}
  MORE OF:       ${(mbd.moreOf || []).filter(Boolean).join(', ') || 'N/A'}
  BETTER:        ${(mbd.better || []).filter(Boolean).join(', ') || 'N/A'}
  DIFFERENTLY:   ${(mbd.differently || []).filter(Boolean).join(', ') || 'N/A'}
  COMPLETE WHEN: ${mbd.completeWhen || 'N/A'}
  OWNER: ${mbd.owner || 'N/A'}  DUE: ${mbd.due || 'N/A'}
` : '';

  return `Analyze this PCT Catalyst assessment and generate a structured leadership development summary.

PARTICIPANT: ${response.name || 'Unknown'}, ${response.role || 'Unknown'}
COHORT: ${cohortName}

PCT PULSE SCORES (1=Strongly Disagree, 7=Strongly Agree):
${scoresBlock}

OVERALL AVERAGE: ${avg}/7
QUADRANT AVERAGES:
  ASPIRATION (PCT 1,2): ${quadrantAvg(scores, 'ASPIRATION')}
  ALIGNMENT (PCT 3,4,10): ${quadrantAvg(scores, 'ALIGNMENT')}
  AUTONOMY (PCT 5,6): ${quadrantAvg(scores, 'AUTONOMY')}
  ACCOUNTABILITY (PCT 7,8,9): ${quadrantAvg(scores, 'ACCOUNTABILITY')}

PRIORITY ELEMENT SELECTED: ${priorityEl ? `PCT ${priorityEl.n} — ${priorityEl.title}` : 'N/A'}

RANKED SHIFTS (their chosen order 1-10):
${rankedBlock || 'N/A'}
${activatorBlock}
Return a JSON object with exactly this structure:
{
  "headline": "One sentence capturing this leader's core development theme (max 20 words)",
  "strengthAreas": [
    { "element": "PCT N — Title", "score": 6, "insight": "2-3 sentence observation about what this score reveals about their leadership" }
  ],
  "developmentAreas": [
    { "element": "PCT N — Title", "score": 3, "insight": "2-3 sentence observation about the gap and its likely organizational impact" }
  ],
  "priorityAnalysis": {
    "element": "PCT N — Title",
    "whyItMatters": "2-3 sentences on why this is the right priority given their overall profile",
    "activatorQuality": "1-2 sentences assessing the quality and specificity of their MBD activators",
    "refinedComplete": "A sharper, more behavioral rewrite of their completion statement if it is vague, otherwise return their original"
  },
  "quadrantProfile": {
    "dominantQuadrant": "ASPIRATION | ALIGNMENT | AUTONOMY | ACCOUNTABILITY",
    "profileNarrative": "3-4 sentences describing what this quadrant pattern reveals about their leadership style and organizational impact",
    "watchOut": "1-2 sentences on the key blind spot or risk this profile creates"
  },
  "coachingQuestions": [
    "Question 1 — provocative, specific to their data",
    "Question 2 — challenges their priority choice",
    "Question 3 — about their lowest scoring element"
  ],
  "90DayFocus": {
    "week1to2": "Specific action tied to their #1 ranked shift",
    "week3to6": "Specific action tied to their MBD activators",
    "week7to12": "Specific action tied to their lowest PCT score",
    "successIndicator": "One observable behavioral marker that proves progress at 90 days"
  }
}

Return ONLY the JSON object. No preamble, no markdown fences.`;
}

async function generateIndividualSummary(response, cohortName) {
  const ai = getClient();

  const userPrompt = buildIndividualPrompt(response, cohortName);

  async function attempt() {
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are an expert leadership coach specializing in the People-Centered Transformation (PCT) methodology developed by Tony O'Driscoll at Duke University. You analyze leadership assessment data and provide specific, actionable, evidence-based coaching insights. Your tone is direct, warm, and practical — like a trusted advisor, not a consultant report.`,
      messages: [{ role: 'user', content: userPrompt }]
    });
    const text = msg.content[0].text.trim();
    return JSON.parse(text);
  }

  try {
    return await attempt();
  } catch (e) {
    // retry once
    return await attempt();
  }
}

async function generateCohortSynthesis(cohort, responses) {
  const ai = getClient();

  const submitted = responses.filter(r => r.submitted_at);
  const n = submitted.length;

  // Element averages
  const avgs = Array(10).fill(0);
  let counted = 0;
  for (const r of submitted) {
    const scores = JSON.parse(r.scores || '[]');
    if (scores.length === 10 && scores.every(s => s !== null)) {
      scores.forEach((s, i) => avgs[i] += s);
      counted++;
    }
  }
  const avgScores = counted ? avgs.map(v => +(v / counted).toFixed(2)) : avgs;

  // Priority distribution
  const priorityCounts = {};
  for (const r of submitted) {
    if (r.priority !== null && r.priority !== undefined) {
      priorityCounts[r.priority] = (priorityCounts[r.priority] || 0) + 1;
    }
  }

  // Top ranked #1 shift
  const rank1Counts = {};
  for (const r of submitted) {
    const ranking = JSON.parse(r.ranking || '[]');
    if (ranking.length) {
      rank1Counts[ranking[0]] = (rank1Counts[ranking[0]] || 0) + 1;
    }
  }
  const topRank1 = Object.entries(rank1Counts).sort((a, b) => b[1] - a[1])[0];

  // Complete statements
  const completeStatements = submitted.map(r => {
    const act = JSON.parse(r.activators || '{}');
    const p = r.priority;
    return p !== null && act[p] ? act[p].completeWhen : null;
  }).filter(Boolean);

  const elementAvgsBlock = PCT_ELEMENTS.map((el, i) =>
    `PCT ${el.n} — ${el.title}: ${avgScores[i]}/7`
  ).join('\n');

  const priorityBlock = Object.entries(priorityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([idx, cnt]) => `  PCT ${PCT_ELEMENTS[idx].n} — ${PCT_ELEMENTS[idx].title}: ${cnt} participants`)
    .join('\n');

  const prompt = `Analyze this PCT Catalyst cohort assessment data and generate a synthesis for the facilitator.

COHORT: ${cohort.name}
SPONSOR: ${cohort.sponsor || 'N/A'}
PARTICIPANTS SUBMITTED: ${n}

COHORT ELEMENT AVERAGES (1-7):
${elementAvgsBlock}

PRIORITY ELEMENT DISTRIBUTION (how many participants chose each):
${priorityBlock || 'No data'}

MOST COMMON #1 RANKED SHIFT: ${topRank1 ? `PCT ${PCT_ELEMENTS[topRank1[0]].n} — ${PCT_ELEMENTS[topRank1[0]].title} (${topRank1[1]} participants)` : 'N/A'}

SAMPLE COMPLETION STATEMENTS (from MBD activators):
${completeStatements.slice(0, 8).map((s, i) => `${i + 1}. "${s}"`).join('\n') || 'None'}

Return a JSON object with exactly this structure:
{
  "cohortHeadline": "One sentence capturing the collective development theme",
  "collectiveStrengths": "2-3 sentences about what this cohort does well collectively",
  "collectiveDevelopment": "2-3 sentences about the most critical collective development needs",
  "priorityAlignment": "2-3 sentences on whether cohort priorities are aligned or scattered, and what that means",
  "facilitatorRecommendations": [
    { "focus": "Topic area", "rationale": "Why this matters for this cohort", "activity": "Specific facilitation activity or exercise to try" },
    { "focus": "Topic area", "rationale": "Why this matters for this cohort", "activity": "Specific facilitation activity or exercise to try" },
    { "focus": "Topic area", "rationale": "Why this matters for this cohort", "activity": "Specific facilitation activity or exercise to try" }
  ],
  "sessionDesignSuggestion": "2-3 sentences on how to structure the session given this cohort's data"
}

Return ONLY the JSON object. No preamble, no markdown fences.`;

  const msg = await ai.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `You are an expert leadership coach and facilitator specializing in the People-Centered Transformation (PCT) methodology developed by Tony O'Driscoll at Duke University. You synthesize cohort assessment data to help facilitators design impactful learning experiences.`,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = msg.content[0].text.trim();
  return JSON.parse(text);
}

module.exports = { isAIAvailable, generateIndividualSummary, generateCohortSynthesis };
