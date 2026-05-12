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
  { n:1,  title:"Communicate a Compelling Change Narrative", quadrant:"ASPIRATION",    shifts:["The Shared Aspiration over …the Required Action","The Possible Future over …the Problematic Present","The Purposeful 'Why'… over …the Actionable 'What'/'How'"] },
  { n:2,  title:"Act to Think Differently",                  quadrant:"ASPIRATION",    shifts:["Demonstrating Changed Behavior over …Demanding Changed Behavior","Being Authentic and Open over …Being Authoritarian and Overbearing","Trying and Learning over …Thinking and Planning"] },
  { n:3,  title:"Embrace Situational Humility",              quadrant:"ALIGNMENT",     shifts:["Showing Vulnerability over …Projecting Power","Asking Open Questions over …Demanding Definitive Answers","Making Failure Safe over …Playing it Safe"] },
  { n:4,  title:"Focus Attention on What Matters",           quadrant:"ALIGNMENT",     shifts:["Focusing Strategic Attention over …Measuring Project Progress","Disciplined Prioritization over …Holding Multiple Options","Pruning Project Portfolios over …Letting Projects Flow"] },
  { n:5,  title:"Motivate Discretionary Effort",             quadrant:"AUTONOMY",      shifts:["Channeling Aspiration over …Dictating Direction","Motivating Inspiration over …Manipulating with Fear","Recognizing Novel Effort over …Requiring Procedural Conformity"] },
  { n:6,  title:"Give Others Agency",                        quadrant:"AUTONOMY",      shifts:["Give-and-Take Reciprocity over …Top Down Hierarchy","Allowing Independent Action over …Requiring Prior Permission","Giving Individual Agency over …Exercising Executive Authority"] },
  { n:7,  title:"Decentralize Decision Making",              quadrant:"ACCOUNTABILITY",shifts:["Experience and Expertise over …Position and Role","Explaining Rationale over …Expecting Agreement","Distributing Decision Making over …Centralizing Decisions"] },
  { n:8,  title:"Catalyze the Network",                      quadrant:"ACCOUNTABILITY",shifts:["Informal Networks over …Organization Hierarchies","Organization Network Analysis over …Organization Restructuring","Emergent Collaborative Teaming over …Assigned Cross-Functional Teams"] },
  { n:9,  title:"Lead the System",                           quadrant:"ACCOUNTABILITY",shifts:["Systemic Collective Leadership over …Functional Hierarchical Leadership","Catalyze and Guide Change over …Control and Monitor Compliance","Adaptive Leadership Systems over …Technical Leadership Practices"] },
  { n:10, title:"Nudge the Culture",                         quadrant:"ALIGNMENT",     shifts:["The Human/Emotional Change over …The Technical/Rational Change","Activating PCT Elements over …Tackling Culture Directly","Nudging the Culture over …Leaving Culture Change to Chance"] }
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
  const leadership = submitted.filter(r => (r.role || 'leadership') === 'leadership');
  const org = submitted.filter(r => r.role === 'org');

  function groupAvgs(group) {
    const avgs = Array(10).fill(0);
    let counted = 0;
    for (const r of group) {
      const scores = typeof r.scores === 'string' ? JSON.parse(r.scores || '[]') : (r.scores || []);
      if (scores.length === 10 && scores.every(s => s !== null)) {
        scores.forEach((s, i) => avgs[i] += s);
        counted++;
      }
    }
    return counted ? avgs.map(v => +(v / counted).toFixed(2)) : null;
  }

  const leadershipAvgs = groupAvgs(leadership);
  const orgAvgs = groupAvgs(org);

  function mbdThemes(group, field) {
    const items = [];
    for (const r of group) {
      const act = typeof r.activators === 'string' ? JSON.parse(r.activators || '{}') : (r.activators || {});
      for (const shiftData of Object.values(act)) {
        if (shiftData && shiftData[field]) {
          items.push(...(shiftData[field] || []).filter(Boolean));
        }
      }
    }
    return items.slice(0, 10).map((s, i) => `${i + 1}. "${s}"`).join('\n') || 'None';
  }

  const allSubmitted = submitted;
  const n = allSubmitted.length;

  const elementBlock = PCT_ELEMENTS.map((el, i) => {
    const la = leadershipAvgs ? leadershipAvgs[i] : 'N/A';
    const oa = orgAvgs ? orgAvgs[i] : 'N/A';
    return `PCT ${el.n} — ${el.title}: Leadership=${la}, Org=${oa}`;
  }).join('\n');

  const prompt = `Analyze this PCT Catalyst cohort assessment and generate a thematic synthesis.

COHORT: ${cohort.name} | SPONSOR: ${cohort.sponsor || 'N/A'}
LEADERSHIP RESPONDENTS: ${leadership.length} | ORG RESPONDENTS: ${org.length} | TOTAL: ${n}

ELEMENT AVERAGES (Leadership vs Org, scale 1-7):
${elementBlock}

LEADERSHIP — MORE OF themes:
${mbdThemes(leadership, 'moreOf')}

ORG — MORE OF themes:
${mbdThemes(org, 'moreOf')}

LEADERSHIP — BETTER themes:
${mbdThemes(leadership, 'better')}

ORG — BETTER themes:
${mbdThemes(org, 'better')}

LEADERSHIP — DIFFERENTLY themes:
${mbdThemes(leadership, 'differently')}

ORG — DIFFERENTLY themes:
${mbdThemes(org, 'differently')}

For each MBD column (moreOf, better, differently), identify the top 3 thematic patterns across ALL responses. Note where leadership and org themes diverge significantly.

Return ONLY valid JSON with exactly these 5 keys, no markdown, no preamble:
{
  "moreOf": "Top 3 thematic patterns for MORE OF across all respondents (2-3 sentences)",
  "better": "Top 3 thematic patterns for BETTER across all respondents (2-3 sentences)",
  "differently": "Top 3 thematic patterns for DIFFERENTLY across all respondents (2-3 sentences)",
  "leadershipThemes": "Key patterns unique to leadership group (1-2 sentences)",
  "orgThemes": "Key patterns unique to org group, especially where they diverge from leadership (1-2 sentences)"
}`;

  const msg = await ai.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are an expert leadership coach and facilitator specializing in the People-Centered Transformation (PCT) methodology developed by Tony O'Driscoll at Duke University. You synthesize cohort assessment data to help facilitators design impactful learning experiences.`,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = msg.content[0].text.trim();
  return JSON.parse(text);
}

module.exports = { isAIAvailable, generateIndividualSummary, generateCohortSynthesis };
