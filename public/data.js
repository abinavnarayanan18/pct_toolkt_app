const PCT_ELEMENTS = [
  {
    n: 1,
    title: "Communicate a Compelling Change Narrative",
    quadrant: "ASPIRATION",
    quote: "I have a PLAN",
    pulse: "Our leaders communicate a clear, concise, consistent and compelling narrative that makes a purposeful, passionate and emotionally resonant case for change",
    heart: "People must believe that the achievement of a shared aspiration is possible and worthy of their effort before they are willing to change their behavior.",
    shifts: [
      { label: "Narrative over Data",        description: "Lead with story and meaning, not charts and metrics" },
      { label: "Aspiration over Anxiety",    description: "Inspire with a vivid picture of possibility rather than threatening with the cost of inaction" },
      { label: "Resonance over Reasoning",   description: "Earn emotional commitment before seeking intellectual agreement" },
      { label: "Consistency over Spontaneity", description: "Repeat the narrative relentlessly; change the medium, not the message" }
    ]
  },
  {
    n: 2,
    title: "Act to Think Differently",
    quadrant: "ASPIRATION",
    quote: "Be the Change you wish to see",
    pulse: "Our leaders generate respect and followership from others by personally, authentically and openly modelling the changed beliefs and behaviors required to evolve the organization",
    heart: "Leaders who deliberately act their way into a new way of thinking are more successful in changing their own behavior and motivating changed behavior in others.",
    shifts: [
      { label: "Action over Analysis",       description: "Move before you know enough; learn by doing rather than planning to start" },
      { label: "Modeling over Mandating",    description: "Demonstrate the desired behaviors yourself rather than directing others to change" },
      { label: "Experimentation over Execution", description: "Run safe-to-fail experiments rather than implementing large-scale plans" },
      { label: "Vulnerability over Authority", description: "Show the limits of your own knowledge to create permission for others to learn" }
    ]
  },
  {
    n: 3,
    title: "Embrace Situational Humility",
    quadrant: "ALIGNMENT",
    quote: "Leadership is NOT defined by the exercise of power but by the capacity to increase the sense of power among those led",
    pulse: "Our leaders show vulnerability, seek help, demonstrate that failure is acceptable, and consistently seek to increase the autonomy and accountability of others",
    heart: "Leaders must embrace Situational Humility by showing vulnerability, seeking help, asking questions and demonstrating that failure is acceptable.",
    shifts: [
      { label: "Questions over Answers",     description: "Ask more than you tell; seek understanding before offering solutions" },
      { label: "Learning over Knowing",      description: "Treat every interaction as an opportunity to update your thinking" },
      { label: "Curiosity over Certainty",   description: "Stay genuinely open to being wrong; hold views lightly" },
      { label: "Invitation over Direction",  description: "Bring people into the thinking rather than presenting finished conclusions" }
    ]
  },
  {
    n: 4,
    title: "Focus Attention on What Matters",
    quadrant: "ALIGNMENT",
    quote: "Focus is about saying NO!",
    pulse: "Our leaders bring clarity and focus by prioritizing and communicating the key strategic priorities that matter most to the business",
    heart: "To reduce collaborative overload, leaders must adopt a portfolio-based approach to change focused on the vital few initiatives that matter most.",
    shifts: [
      { label: "Vital Few over Trivial Many", description: "Ruthlessly narrow to the initiatives that will move the needle most" },
      { label: "Depth over Breadth",         description: "Do fewer things significantly better rather than many things incrementally" },
      { label: "No over Yes",                description: "Make saying no your default; require a strong case to add rather than remove" },
      { label: "Clarity over Comprehensiveness", description: "Be explicit about what is NOT a priority, not just what is" }
    ]
  },
  {
    n: 5,
    title: "Motivate Discretionary Effort",
    quadrant: "AUTONOMY",
    quote: "Individual commitment to a group effort — that is what makes a team work, a company work, a society work",
    pulse: "Our leaders understand how to motivate discretionary effort by tapping into the aspirations of others and giving them autonomy in return for accountability",
    heart: "To unlock discretionary effort leaders must focus on intrinsic motivational levers that compel people to go the extra mile.",
    shifts: [
      { label: "Intrinsic over Extrinsic",   description: "Activate purpose, mastery, and autonomy rather than rely on incentives and rewards" },
      { label: "Meaning over Compliance",    description: "Connect work to something larger than the task or the paycheck" },
      { label: "Autonomy over Direction",    description: "Trust people to determine how they achieve the goal rather than dictating the method" },
      { label: "Recognition over Reward",    description: "Acknowledge contribution authentically rather than compensate performance transactionally" }
    ]
  },
  {
    n: 6,
    title: "Give Others Agency",
    quadrant: "AUTONOMY",
    quote: "Agency is a two-way street: Power comes with responsibility and accountability",
    pulse: "Our leaders create agency by giving others the permission to take independent actions and make changes without hierarchical approval",
    heart: "Organizations that give people agency — the permission to take independent action or make changes without approval — are far more likely to succeed in transformation.",
    shifts: [
      { label: "Trust over Control",         description: "Extend belief in people's capacity rather than building systems to monitor their activity" },
      { label: "Permission over Approval",   description: "Grant standing authority rather than requiring case-by-case sign-off" },
      { label: "Accountability over Oversight", description: "Hold people responsible for outcomes rather than supervising their process" },
      { label: "Ownership over Assignment",  description: "Let people claim work rather than have it delegated down" }
    ]
  },
  {
    n: 7,
    title: "Decentralize Decision Making",
    quadrant: "ACCOUNTABILITY",
    quote: "In most organizations the bottleneck is at the top of the bottle",
    pulse: "Our leaders only make the choices they are best equipped to make, clarify the choices others should make and the boundaries within which to make them",
    heart: "Roger Martin envisions organizations as decision factories and argues that leaders should only make the choices they are best-equipped to make.",
    shifts: [
      { label: "Distributed over Centralized", description: "Push decision rights to the point closest to the work" },
      { label: "Context over Commands",      description: "Share strategic intent and let people decide rather than issue directives" },
      { label: "Guidance over Gatekeeping",  description: "Coach the decision-maker rather than become the decision-maker" },
      { label: "Speed over Perfection",      description: "Enable fast, good-enough decisions close to the action rather than slow, perfect ones at the top" }
    ]
  },
  {
    n: 8,
    title: "Catalyze the Network",
    quadrant: "ACCOUNTABILITY",
    quote: "We need a second operating system devoted to the design and delivery of strategy using an agile, network-like structure",
    pulse: "Our leaders create the time and space for cross-functional teams to emerge, converge, and engage around crucial strategy design and delivery interfaces",
    heart: "Leaders must exercise their position power to override the traditional hierarchy, creating space for cross-functional teams to engage around critical transformation interfaces.",
    shifts: [
      { label: "Network over Hierarchy",     description: "Build lateral connections across the organization rather than relying on vertical chains" },
      { label: "Collaboration over Silos",   description: "Measure and reward cross-functional value creation, not just departmental performance" },
      { label: "Emergence over Assignment",  description: "Let teams form organically around critical problems rather than assigning to functions" },
      { label: "Broker over Director",       description: "Connect people to each other rather than channel all information through yourself" }
    ]
  },
  {
    n: 9,
    title: "Lead the System",
    quadrant: "ACCOUNTABILITY",
    quote: "Real change starts with recognizing that we are part of the systems we seek to change",
    pulse: "Our leaders catalyze the collaborative leadership required to successfully navigate dynamic, complex, and systemic change",
    heart: "We need a new kind of leader — a systems leader — to catalyse the collaborative leadership required to successfully navigate dynamic, complex and systemic change.",
    shifts: [
      { label: "Whole over Parts",           description: "Optimize total system performance rather than maximizing individual unit metrics" },
      { label: "Interdependence over Independence", description: "Actively surface and manage the connections between parts rather than treating them as separate" },
      { label: "Collective over Individual", description: "Invest in shared capability and infrastructure rather than individual heroics" },
      { label: "Adaptive over Predictive",   description: "Sense and respond to emerging signals rather than executing a fixed plan" }
    ]
  },
  {
    n: 10,
    title: "Nudge the Culture",
    quadrant: "ALIGNMENT",
    quote: "Culture isn't just one aspect of the game, it is the game",
    pulse: "Our leaders consciously and continuously nudge the culture in the direction of aspiration, alignment, autonomy and accountability",
    heart: "Culture acts as a limiting and resistive force to strategic change. While culture is notoriously hard to change, it cannot be left to chance.",
    shifts: [
      { label: "Norms over Rules",           description: "Shape behavior through social expectations and story rather than policy and compliance" },
      { label: "Behaviors over Beliefs",     description: "Act your way into a new way of thinking rather than thinking your way into acting" },
      { label: "Informal over Formal",       description: "Use symbols, rituals, and stories rather than org charts and processes to shift culture" },
      { label: "Continuous over Episodic",   description: "Nudge culture through daily micro-practices rather than annual culture programs" }
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
