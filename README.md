# ShootMate AI

ShootMate AI is a mobile-friendly shoot-planning workspace for photographers and content creators. It builds practical gear checklists, story-led shot ideas, and shoot-day timelines.

## Alexa+ simulated experience

The **Alexa+ Assistant** mode adds a conversational way to use ShootMate planning. Ask for a shoot plan, scene-specific shot ideas, a checklist, a duration-based schedule, or a recommendation for what to photograph next. The assistant updates the existing ShootMate plan panel, and each completed tool call is shown in the conversation.

This is a **simulated Alexa+ experience for the Amazon AppDev 2026 hackathon**. It is not an official Amazon Alexa integration and does not connect to Alexa devices or Amazon services.

## How the agent works

The assistant uses a local intent router and a small registry of typed ShootMate tools. It matches the user's request to a planning action, calls the existing local shoot planner and its curated plan data, then returns the updated plan section and an action summary for the chat. It runs entirely in the browser with no paid AI service, API key, or external assistant account.

## Available assistant tools

- `create_shoot_plan` — creates a shoot plan with a checklist, shot ideas, and schedule.
- `show_shot_ideas` — opens the active plan's shot list or creates a suitable starter plan.
- `show_gear_checklist` — opens the active plan's gear checklist.
- `schedule_shoot_duration` — places the plan's schedule steps across a requested session length, shown as elapsed time.
- `recommend_next_shot` — selects and highlights a shot from the active plan.
- `show_available_actions` — explains the assistant's supported requests.

## Run the project

From the workspace root:

```bash
pnpm install
PORT=19594 BASE_PATH=/ pnpm --filter @workspace/shootmate-ai run dev
```

Open the local URL printed by Vite. In Replit, start the `artifacts/shootmate-ai: web` workflow.

To check the production build:

```bash
PORT=19594 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/shootmate-ai run build
```

The Alexa+ experience is a local hackathon simulation; it should not be represented as an official Alexa product or integration.
