import {
  localShootPlanner,
  type AgentToolAction,
  type ShootPlan,
} from './shoot-planner';

export type ShootPlanSection = 'checklist' | 'shots' | 'schedule';

type ToolContext = {
  prompt: string;
  currentPlan: ShootPlan | null;
  previousRecommendationId?: string | null;
};

type ToolResult = {
  reply: string;
  plan: ShootPlan | null;
  section: ShootPlanSection;
  action: AgentToolAction;
  recommendedShotId?: string;
};

type ToolHandler = (context: ToolContext) => Promise<ToolResult>;

function action(name: string, label: string, summary: string): AgentToolAction {
  return { name, label, summary };
}

function planSummary(plan: ShootPlan): string {
  return `${plan.checklist.length} gear checks · ${plan.shots.length} shot ideas · ${plan.schedule.length} timeline stops`;
}

function hasExplicitShootType(prompt: string): boolean {
  return /\b(wedding|bride|groom|ceremony|pre.?wedding|engagement|couple|product|commercial|packshot|catalog|portrait|headshot|fashion|food|family|equipment|camera|gear)\b/i.test(prompt);
}

function plannerBrief(prompt: string): string {
  return hasExplicitShootType(prompt) ? prompt : `${prompt} portrait session`;
}

async function getPlan(context: ToolContext): Promise<ShootPlan> {
  if (context.currentPlan && !hasExplicitShootType(context.prompt)) return context.currentPlan;
  return (await localShootPlanner.createPlan(plannerBrief(context.prompt))).plan;
}

function parseDurationMinutes(prompt: string): number | null {
  const match = prompt.toLowerCase().match(/\b(\d+(?:\.\d+)?)\s*[-]?\s*(hours?|hrs?|hr|h|minutes?|mins?|min)\b/);
  if (!match) return null;
  const amount = Number(match[1]);
  const duration = /^(h|hr|hrs|hour|hours)$/.test(match[2]) ? amount * 60 : amount;
  if (!Number.isFinite(duration)) return null;
  return Math.max(30, Math.min(720, Math.round(duration)));
}

function formatElapsed(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

const tools: Record<string, ToolHandler> = {
  create_shoot_plan: async ({ prompt }) => {
    const result = await localShootPlanner.createPlan(plannerBrief(prompt));
    return {
      reply: result.reply,
      plan: result.plan,
      section: 'checklist',
      action: action('create_shoot_plan', 'Created a shoot plan', planSummary(result.plan)),
    };
  },

  show_shot_ideas: async (context) => {
    const plan = await getPlan(context);
    const firstShot = plan.shots[0];
    return {
      reply: `I opened ${plan.shots.length} shot ideas from your ${plan.shootType.toLowerCase()} plan. Start with “${firstShot.title}” — ${firstShot.creativeNote}`,
      plan,
      section: 'shots',
      action: action('show_shot_ideas', 'Opened the shot list', `${plan.shootType} · ${plan.shots.length} practical frames`),
    };
  },

  show_gear_checklist: async (context) => {
    const plan = await getPlan(context);
    const firstItems = plan.checklist.slice(0, 3).map((item) => item.label).join(', ');
    return {
      reply: `I opened the ${plan.shootType.toLowerCase()} gear checklist. It has ${plan.checklist.length} items, starting with ${firstItems}.`,
      plan,
      section: 'checklist',
      action: action('show_gear_checklist', 'Opened the gear checklist', `${plan.checklist.length} checklist items from the ${plan.shootType.toLowerCase()} plan`),
    };
  },

  schedule_shoot_duration: async (context) => {
    const durationMinutes = parseDurationMinutes(context.prompt) ?? 180;
    const plan = await getPlan(context);
    const schedule = plan.schedule.map((item, index, items) => ({
      ...item,
      time: formatElapsed(Math.round((durationMinutes * index) / items.length)),
    }));
    const adjustedPlan = { ...plan, schedule };
    const durationLabel = durationMinutes % 60 === 0
      ? `${durationMinutes / 60}-hour`
      : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
    return {
      reply: `I mapped your ${plan.shootType.toLowerCase()} shoot into a ${durationLabel} session. The timeline uses elapsed time from the start, so you can shift it to your actual call time.`,
      plan: adjustedPlan,
      section: 'schedule',
      action: action('schedule_shoot_duration', 'Adjusted the shoot timeline', `${schedule.length} existing plan steps placed across ${durationLabel} (elapsed time)`),
    };
  },

  recommend_next_shot: async (context) => {
    const plan = await getPlan(context);
    const previousIndex = plan.shots.findIndex((shot) => shot.id === context.previousRecommendationId);
    const shot = plan.shots[(previousIndex + 1) % plan.shots.length];
    return {
      reply: `Next, try “${shot.title}” (${shot.moment}). ${shot.creativeNote}`,
      plan,
      section: 'shots',
      recommendedShotId: shot.id,
      action: action('recommend_next_shot', 'Picked your next frame', `${shot.title} · ${shot.moment}`),
    };
  },

  show_available_actions: async ({ currentPlan }) => ({
    reply: 'I can create a shoot plan, open its shot ideas or gear checklist, fit the timeline to a session length, or recommend the next frame. Try “Create a shoot plan for a wedding” or “Plan a 3-hour product shoot.”',
    plan: currentPlan,
    section: 'checklist',
    action: action('show_available_actions', 'Showed supported actions', 'Available ShootMate planning tools are ready to use'),
  }),
};

export type AlexaToolName = keyof typeof tools;

function chooseTool(prompt: string): AlexaToolName {
  const text = prompt.toLowerCase();
  if (/\b(next shot|shoot next|what should i shoot next|what(?:'s| is) next)\b/.test(text)) return 'recommend_next_shot';
  if (parseDurationMinutes(text) !== null && /\b(shoot|photoshoot|photo shoot|session|plan|timeline|schedule)\b/.test(text)) return 'schedule_shoot_duration';
  if (/\b(checklist|check list|gear|equipment|pack(?:ing)?|today(?:'s|s)? shoot|what should i bring)\b/.test(text)) return 'show_gear_checklist';
  if (/\b(shot|shots|frame|frames|scene|angle|composition|ideas?)\b/.test(text)) return 'show_shot_ideas';
  if (/\b(create|build|make|plan|prepare|wedding|pre.?wedding|engagement|couple|product|commercial|packshot|catalog|portrait|headshot|fashion|food|family)\b/.test(text)) return 'create_shoot_plan';
  return 'show_available_actions';
}

export async function runAlexaAssistantTurn(context: ToolContext): Promise<ToolResult> {
  const toolName = chooseTool(context.prompt);
  return tools[toolName](context);
}
