const PCT_ELEMENTS = [
  {
    n: 1,
    title: "Communicate a Compelling Change Narrative",
    quadrant: "ASPIRATION",
    quote: "I have a PLAN",
    heart_quote: '"I have a PLAN"',
    heart_attribution: 'Martin Luther King Jr.',
    pulse: "Our leaders communicate a clear, concise, consistent and compelling narrative that makes a purposeful, passionate and emotionally resonant case for change",
    heart: "People must believe that the achievement of a shared aspiration is possible and worthy of their effort before they are willing to change their behavior.",
    shifts: [
      { label: "The Shared Aspiration over …the Required Action",        description: "Lead with story and meaning, not charts and metrics" },
      { label: "The Possible Future over …the Problematic Present",      description: "Inspire with a vivid picture of possibility rather than threatening with the cost of inaction" },
      { label: "The Purposeful 'Why'… over …the Actionable 'What'/'How'", description: "Earn emotional commitment before seeking intellectual agreement" }
    ]
  },
  {
    n: 2,
    title: "Act to Think Differently",
    quadrant: "ASPIRATION",
    quote: "Be the Change you wish to see",
    heart_quote: '"Be the Change that you wish to see in the world"',
    heart_attribution: 'Gandhi',
    pulse: "Our leaders generate respect and followership from others by personally, authentically and openly modelling the changed beliefs and behaviors required to evolve the organization",
    heart: "Leaders who deliberately act their way into a new way of thinking are more successful in changing their own behavior and motivating changed behavior in others.",
    shifts: [
      { label: "Demonstrating Changed Behavior over …Demanding Changed Behavior",  description: "Move before you know enough; learn by doing rather than planning to start" },
      { label: "Being Authentic and Open over …Being Authoritarian and Overbearing", description: "Demonstrate the desired behaviors yourself rather than directing others to change" },
      { label: "Trying and Learning over …Thinking and Planning",                  description: "Run safe-to-fail experiments rather than implementing large-scale plans" }
    ]
  },
  {
    n: 3,
    title: "Embrace Situational Humility",
    quadrant: "ALIGNMENT",
    quote: "Leadership is NOT defined by the exercise of power but by the capacity to increase the sense of power among those led",
    heart_quote: '"Leadership is NOT defined by the exercise of power, but by the capacity to increase the sense of power among those led"',
    heart_attribution: 'Mary Parker Follett',
    pulse: "Our leaders show vulnerability, seek help, demonstrate that failure is acceptable, and consistently seek to increase the autonomy and accountability of others",
    heart: "Leaders must embrace Situational Humility by showing vulnerability, seeking help, asking questions and demonstrating that failure is acceptable.",
    shifts: [
      { label: "Showing Vulnerability over …Projecting Power",           description: "Ask more than you tell; seek understanding before offering solutions" },
      { label: "Asking Open Questions over …Demanding Definitive Answers", description: "Treat every interaction as an opportunity to update your thinking" },
      { label: "Making Failure Safe over …Playing it Safe",              description: "Stay genuinely open to being wrong; hold views lightly" }
    ]
  },
  {
    n: 4,
    title: "Focus Attention on What Matters",
    quadrant: "ALIGNMENT",
    quote: "Focus is about saying NO!",
    heart_quote: '"Focus is about saying NO!"',
    heart_attribution: 'Steve Jobs',
    pulse: "Our leaders bring clarity and focus by prioritizing and communicating the key strategic priorities that matter most to the business",
    heart: "To reduce collaborative overload, leaders must adopt a portfolio-based approach to change focused on the vital few initiatives that matter most.",
    shifts: [
      { label: "Focusing Strategic Attention over …Measuring Project Progress", description: "Ruthlessly narrow to the initiatives that will move the needle most" },
      { label: "Disciplined Prioritization over …Holding Multiple Options",     description: "Do fewer things significantly better rather than many things incrementally" },
      { label: "Pruning Project Portfolios over …Letting Projects Flow",        description: "Make saying no your default; require a strong case to add rather than remove" }
    ]
  },
  {
    n: 5,
    title: "Motivate Discretionary Effort",
    quadrant: "AUTONOMY",
    quote: "Individual commitment to a group effort — that is what makes a team work, a company work, a society work",
    heart_quote: '"Individual commitment to a group effort – that is what makes a team work, a company work, a society work."',
    heart_attribution: 'Vince Lombardi',
    pulse: "Our leaders understand how to motivate discretionary effort by tapping into the aspirations of others and giving them autonomy in return for accountability",
    heart: "To unlock discretionary effort leaders must focus on intrinsic motivational levers that compel people to go the extra mile.",
    shifts: [
      { label: "Channeling Aspiration over …Dictating Direction",               description: "Activate purpose, mastery, and autonomy rather than rely on incentives and rewards" },
      { label: "Motivating Inspiration over …Manipulating with Fear",           description: "Connect work to something larger than the task or the paycheck" },
      { label: "Recognizing Novel Effort over …Requiring Procedural Conformity", description: "Trust people to determine how they achieve the goal rather than dictating the method" }
    ]
  },
  {
    n: 6,
    title: "Give Others Agency",
    quadrant: "AUTONOMY",
    quote: "Agency is a two-way street: Power comes with responsibility and accountability",
    heart_quote: '"Agency is a two-way street: Power comes with responsibility and accountability"',
    heart_attribution: '',
    pulse: "Our leaders create agency by giving others the permission to take independent actions and make changes without hierarchical approval",
    heart: "Organizations that give people agency — the permission to take independent action or make changes without approval — are far more likely to succeed in transformation.",
    shifts: [
      { label: "Give-and-Take Reciprocity over …Top Down Hierarchy",         description: "Extend belief in people's capacity rather than building systems to monitor their activity" },
      { label: "Allowing Independent Action over …Requiring Prior Permission", description: "Grant standing authority rather than requiring case-by-case sign-off" },
      { label: "Giving Individual Agency over …Exercising Executive Authority", description: "Hold people responsible for outcomes rather than supervising their process" }
    ]
  },
  {
    n: 7,
    title: "Decentralize Decision Making",
    quadrant: "ACCOUNTABILITY",
    quote: "In most organizations the bottleneck is at the top of the bottle",
    heart_quote: '"In most organizations the bottleneck is at the top of the bottle."',
    heart_attribution: 'Roger Martin',
    pulse: "Our leaders only make the choices they are best equipped to make, clarify the choices others should make and the boundaries within which to make them",
    heart: "Roger Martin envisions organizations as decision factories and argues that leaders should only make the choices they are best-equipped to make.",
    shifts: [
      { label: "Experience and Expertise over …Position and Role",     description: "Push decision rights to the point closest to the work" },
      { label: "Explaining Rationale over …Expecting Agreement",       description: "Share strategic intent and let people decide rather than issue directives" },
      { label: "Distributing Decision Making over …Centralizing Decisions", description: "Coach the decision-maker rather than become the decision-maker" }
    ]
  },
  {
    n: 8,
    title: "Catalyze the Network",
    quadrant: "ACCOUNTABILITY",
    quote: "We need a second operating system devoted to the design and delivery of strategy using an agile, network-like structure",
    heart_quote: '"We need a second operating system devoted to the design and delivery of strategy that uses an agile, network like structure."',
    heart_attribution: 'John Kotter',
    pulse: "Our leaders create the time and space for cross-functional teams to emerge, converge, and engage around crucial strategy design and delivery interfaces",
    heart: "Leaders must exercise their position power to override the traditional hierarchy, creating space for cross-functional teams to engage around critical transformation interfaces.",
    shifts: [
      { label: "Informal Networks over …Organization Hierarchies",                  description: "Build lateral connections across the organization rather than relying on vertical chains" },
      { label: "Organization Network Analysis over …Organization Restructuring",    description: "Measure and reward cross-functional value creation, not just departmental performance" },
      { label: "Emergent Collaborative Teaming over …Assigned Cross-Functional Teams", description: "Let teams form organically around critical problems rather than assigning to functions" }
    ]
  },
  {
    n: 9,
    title: "Lead the System",
    quadrant: "ACCOUNTABILITY",
    quote: "Real change starts with recognizing that we are part of the systems we seek to change",
    heart_quote: '"Real change starts with recognizing that we are part of the systems we seek to change."',
    heart_attribution: 'Peter Senge',
    pulse: "Our leaders catalyze the collaborative leadership required to successfully navigate dynamic, complex, and systemic change",
    heart: "We need a new kind of leader — a systems leader — to catalyse the collaborative leadership required to successfully navigate dynamic, complex and systemic change.",
    shifts: [
      { label: "Systemic Collective Leadership over …Functional Hierarchical Leadership", description: "Optimize total system performance rather than maximizing individual unit metrics" },
      { label: "Catalyze and Guide Change over …Control and Monitor Compliance",          description: "Actively surface and manage the connections between parts rather than treating them as separate" },
      { label: "Adaptive Leadership Systems over …Technical Leadership Practices",        description: "Invest in shared capability and infrastructure rather than individual heroics" }
    ]
  },
  {
    n: 10,
    title: "Nudge the Culture",
    quadrant: "ALIGNMENT",
    quote: "Culture isn't just one aspect of the game, it is the game",
    heart_quote: '"I came to see, in my time at IBM, that culture isn\'t just one aspect of the game, it is the game."',
    heart_attribution: 'Lou Gerstner',
    pulse: "Our leaders consciously and continuously nudge the culture in the direction of aspiration, alignment, autonomy and accountability",
    heart: "Culture acts as a limiting and resistive force to strategic change. While culture is notoriously hard to change, it cannot be left to chance.",
    shifts: [
      { label: "The Human/Emotional Change over …The Technical/Rational Change", description: "Shape behavior through social expectations and story rather than policy and compliance" },
      { label: "Activating PCT Elements over …Tackling Culture Directly",        description: "Act your way into a new way of thinking rather than thinking your way into acting" },
      { label: "Nudging the Culture over …Leaving Culture Change to Chance",     description: "Use symbols, rituals, and stories rather than org charts and processes to shift culture" }
    ]
  }
];

const QUADRANT_COLORS = {
  ASPIRATION:    '#1565c0',
  ALIGNMENT:     '#6a1b9a',
  AUTONOMY:      '#e65100',
  ACCOUNTABILITY:'#1f6f5c'
};

const QUADRANT_BG = {
  ASPIRATION:    '#e8f4fd',
  ALIGNMENT:     '#f3e5f5',
  AUTONOMY:      '#fff3e0',
  ACCOUNTABILITY:'#e6efe9'
};
