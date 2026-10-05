export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  category: string;
  checked: boolean;
};

export type ShotItem = {
  id: string;
  title: string;
  moment: string;
  creativeNote: string;
};

export type ScheduleItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
};

export type ShootPlan = {
  shootType: string;
  checklist: ChecklistItem[];
  shots: ShotItem[];
  schedule: ScheduleItem[];
};

export type PlannerResult = { reply: string; plan: ShootPlan };

export interface ShootPlannerService {
  createPlan(prompt: string): Promise<PlannerResult>;
}

const makeItems = <T extends { id: string }>(items: Omit<T, 'id'>[], prefix: string): T[] =>
  items.map((item, index) => ({ ...item, id: `${prefix}-${index + 1}` }) as T);

const templates = {
  wedding: {
    type: 'Wedding day',
    checklist: [
      ['Camera bodies', 'Camera bag'], ['24–70mm f/2.8 lens', 'Lenses'], ['70–200mm f/2.8 lens', 'Lenses'],
      ['35mm or 50mm prime', 'Lenses'], ['Two speedlights + diffuser', 'Lighting'], ['Radio triggers', 'Lighting'],
      ['6 formatted memory cards', 'Power & media'], ['4 charged batteries', 'Power & media'], ['Dual-slot backup check', 'Power & media'],
      ['Rain covers + microfiber cloth', 'Just in case'],
    ],
    shots: [
      ['The quiet details', 'Before guests arrive', 'Gather rings, invitation, florals and heirlooms near a window; keep the frame airy.'],
      ['A final getting-ready moment', 'Preparation', 'Photograph the in-between: hands, laughter, a deep breath before the dress goes on.'],
      ['The first look', 'Portraits', 'Give them a little space. Start wide, then move close without interrupting the reaction.'],
      ['The aisle perspective', 'Ceremony', 'Make one safe frame from the back, then move to the side for expressions.'],
      ['The just-married exhale', 'After the ceremony', 'Let the couple walk toward you, not pose. Look for hands finding each other.'],
      ['A last-light portrait', 'Golden hour', 'Backlight gently and keep a little ambient sky in the frame.'],
    ],
    schedule: [
      ['10:00', 'Arrive & scout', 'Confirm light, ceremony restrictions and family photo location.'],
      ['11:00', 'Details & getting ready', 'Photograph details first; keep one body ready for candid moments.'],
      ['13:30', 'First look & portraits', 'Allow 35 minutes plus a quiet buffer.'],
      ['15:00', 'Ceremony', 'Arrive early for processional positions and exposure check.'],
      ['16:00', 'Family portraits', 'Use the prepared list; keep groups moving.'],
      ['18:15', 'Golden-hour portraits', 'Step out for 15–20 minutes if the light opens up.'],
    ],
  },
  prewedding: {
    type: 'Pre-wedding couple session',
    checklist: [
      ['Two camera bodies', 'Camera bag'], ['35mm f/1.4 prime', 'Lenses'], ['85mm portrait lens', 'Lenses'],
      ['Circular polarizer', 'Lenses'], ['Reflector or small bounce', 'Lighting'], ['3 charged batteries', 'Power & media'],
      ['Formatted cards + spare', 'Power & media'], ['Location permit & contact', 'Essentials'], ['Water and a small towel', 'Essentials'],
    ],
    shots: [
      ['A scene-setting walk-in', 'Opening', 'Start with context and let them settle into the space together.'],
      ['The almost-touch', 'Warm-up', 'Ask them to stand close and talk; watch hands and glances instead of directing faces.'],
      ['A little movement', 'Connection', 'Walk, turn, pause. Use a longer lens to keep the moment private.'],
      ['Framed by the place', 'Location portrait', 'Layer foliage, architecture or a doorway for depth and a sense of place.'],
      ['The honest laugh', 'Candid', 'Give a small prompt, then wait through the first laugh for the quieter one after.'],
      ['A silhouette to finish', 'Closing light', 'Expose for the sky and let their shape carry the frame.'],
    ],
    schedule: [
      ['16:00', 'Scout & check light', 'Choose a shaded starting point and one clear sunset direction.'],
      ['16:20', 'Easy walking frames', 'Keep the first ten minutes conversational and low-pressure.'],
      ['16:50', 'Close portraits', 'Move into quieter, more connected prompts.'],
      ['17:25', 'Location variations', 'Change your angle and focal length before moving locations.'],
      ['17:50', 'Golden-hour finish', 'Save the silhouette and widest frame for the final light.'],
    ],
  },
  equipment: {
    type: 'Camera equipment',
    checklist: [
      ['Primary camera body', 'Camera bag'], ['Backup camera body', 'Camera bag'], ['24–70mm everyday zoom', 'Lenses'],
      ['Portrait or low-light prime', 'Lenses'], ['Telephoto lens (if needed)', 'Lenses'], ['Charged batteries (3+)', 'Power & media'],
      ['Formatted cards + spare', 'Power & media'], ['Lens cloth and blower', 'Maintenance'], ['Tripod or monopod', 'Support'],
      ['Weather protection', 'Just in case'], ['Card reader for backup', 'Workflow'],
    ],
    shots: [
      ['Wide establishing frame', 'Start of shoot', 'Make one intentional frame that explains the setting.'],
      ['Mid-range story frame', 'Main sequence', 'Work at eye level and make the subject feel present in their space.'],
      ['Tight detail frame', 'Main sequence', 'Look for hands, texture and the small thing that makes this shoot specific.'],
      ['Alternate angle', 'Variation', 'Change height or direction before changing the lens.'],
    ],
    schedule: [
      ['T−45 min', 'Charge & format', 'Check every battery and confirm cards are formatted in-camera.'],
      ['T−30 min', 'Pack by sequence', 'Keep camera, go-to lens and spare battery easy to reach.'],
      ['T−15 min', 'Arrive & scout', 'Check access, weather, available light and a backup spot.'],
      ['Shoot', 'Capture & review', 'Review one test frame, then get back into the moment.'],
      ['Wrap', 'Back up twice', 'Copy cards to two separate drives before formatting.'],
    ],
  },
};

function identifyType(prompt: string): keyof typeof templates {
  const text = prompt.toLowerCase();
  if (/pre.?wedding|engagement|couple/.test(text)) return 'prewedding';
  if (/equipment|camera|gear|pack|kit/.test(text)) return 'equipment';
  return 'wedding';
}

export const localShootPlanner: ShootPlannerService = {
  async createPlan(prompt) {
    await new Promise((resolve) => window.setTimeout(resolve, 380));
    const selected = templates[identifyType(prompt)];
    const plan: ShootPlan = {
      shootType: selected.type,
      checklist: makeItems<ChecklistItem>(
        selected.checklist.map(([label, category]) => ({ label, category, checked: false })),
        'check',
      ),
      shots: makeItems<ShotItem>(
        selected.shots.map(([title, moment, creativeNote]) => ({ title, moment, creativeNote })),
        'shot',
      ),
      schedule: makeItems<ScheduleItem>(
        selected.schedule.map(([time, title, detail]) => ({ time, title, detail })),
        'schedule',
      ),
    };
    const customContext = prompt.trim().length > 28
      ? ' I’ve kept this as a flexible starting point; tell me your location, start time or camera kit and I’ll tune the details.'
      : '';
    return {
      plan,
      reply: `Your ${selected.type.toLowerCase()} plan is ready. I’ve put together a practical gear checklist, a sequence of story-led frames, and a schedule with breathing room built in.${customContext}`,
    };
  },
};

export function makeMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return {
    id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
    timestamp: new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
  };
}