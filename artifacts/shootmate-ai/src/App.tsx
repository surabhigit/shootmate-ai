import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Aperture, ArrowUp, Check, CheckCheck, Clipboard, Clock3, Compass,
  ListChecks, MessageCircle, Plus, RotateCcw, Sparkles, Camera, Image,
  CalendarDays, X,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter } from 'wouter';
import {
  localShootPlanner, makeMessage,
  type ChatMessage, type ChecklistItem, type ShootPlan,
} from './services/shoot-planner';
import './index.css';

const queryClient = new QueryClient();
const quickActions = [
  { label: 'Wedding checklist', icon: ListChecks },
  { label: 'Pre-wedding shot list', icon: Image },
  { label: 'Camera equipment checklist', icon: Camera },
  { label: 'Wedding day timeline', icon: CalendarDays },
];
const initialMessages: ChatMessage[] = [
  makeMessage('assistant', 'Tell me what you’re shooting and I’ll help you feel ready before you arrive. Start with a quick action, or describe the day in your own words.'),
];

function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [plan, setPlan] = useState<ShootPlan | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'plan'>('chat');
  const [planView, setPlanView] = useState<'checklist' | 'shots' | 'schedule'>('checklist');
  const [toast, setToast] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const notify = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  };

  const sendPrompt = async (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt || loading) return;
    setDraft('');
    setMessages((current) => [...current, makeMessage('user', prompt)]);
    setLoading(true);
    if (prompt.toLowerCase().includes('timeline')) setPlanView('schedule');
    else if (/shot list|pre.?wedding/i.test(prompt)) setPlanView('shots');
    else setPlanView('checklist');
    try {
      const result = await localShootPlanner.createPlan(prompt);
      setPlan(result.plan);
      setMessages((current) => [...current, makeMessage('assistant', result.reply)]);
    } catch {
      setMessages((current) => [...current, makeMessage('assistant', 'I couldn’t put that plan together just now. Try again with a shoot type, like a wedding or portrait session.')]);
      notify('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setMobileView('plan');
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendPrompt(draft);
  };
  const handleComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendPrompt(draft);
    }
  };
  const toggleCheck = (id: string) => {
    setPlan((current) => current ? ({
      ...current,
      checklist: current.checklist.map((item) => item.id === id ? { ...item, checked: !item.checked } : item),
    }) : current);
  };
  const addChecklistItem = () => {
    if (!plan) return;
    const label = window.prompt('What would you like to add to your checklist?')?.trim();
    if (!label) return;
    const item: ChecklistItem = { id: `custom-${Date.now()}`, label, category: 'Added by you', checked: false };
    setPlan((current) => current ? { ...current, checklist: [...current.checklist, item] } : current);
    notify('Added to your checklist.');
  };
  const resetChecks = () => {
    if (!plan) return;
    setPlan((current) => current ? { ...current, checklist: current.checklist.map((item) => ({ ...item, checked: false })) } : current);
    notify('Checklist is ready to go again.');
  };
  const copyPlan = async () => {
    if (!plan) return;
    const text = `${plan.shootType} plan\n\nCHECKLIST\n${plan.checklist.map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.label}`).join('\n')}\n\nSHOT LIST\n${plan.shots.map((shot) => `${shot.moment}: ${shot.title} — ${shot.creativeNote}`).join('\n')}\n\nSCHEDULE\n${plan.schedule.map((item) => `${item.time} ${item.title} — ${item.detail}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      notify('Your shoot plan was copied.');
    } catch {
      notify('Clipboard access is unavailable in this browser.');
    }
  };
  const checkedCount = plan?.checklist.filter((item) => item.checked).length ?? 0;
  const completion = plan?.checklist.length ? Math.round((checkedCount / plan.checklist.length) * 100) : 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" data-testid="text-brand">
          <span className="brand-mark"><Aperture size={19} strokeWidth={1.8} /></span>
          <span>ShootMate <small>AI</small></span>
        </div>
        <div className="topbar-right">
          <span className="local-pill"><i /> Private workspace</span>
          <span className="top-caption">Your creative sidekick</span>
          <span className="avatar" aria-label="Photographer profile">JM</span>
        </div>
      </header>

      <section className="workspace">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">YOUR SHOOT DESK · TUESDAY, MAY 21</div>
            <h1>Let’s make the day yours.</h1>
            <p>A little prep now leaves more room for the moments that matter.</p>
          </div>
          <div className="session-tag"><Sparkles /> LOCAL PLANNING MODE</div>
        </div>

        <div className="mobile-tabs" role="tablist" aria-label="Workspace view">
          <button className={`mobile-tab ${mobileView === 'chat' ? 'active' : ''}`} onClick={() => setMobileView('chat')} role="tab" aria-selected={mobileView === 'chat'} data-testid="tab-chat">
            <MessageCircle /> Conversation
          </button>
          <button className={`mobile-tab ${mobileView === 'plan' ? 'active' : ''}`} onClick={() => setMobileView('plan')} role="tab" aria-selected={mobileView === 'plan'} data-testid="tab-plan">
            <ListChecks /> Shoot plan {plan && <span>·</span>}
          </button>
        </div>

        <div className="workspace-grid">
          <section className={`panel chat-panel ${mobileView !== 'chat' ? 'hidden-mobile' : ''}`} aria-label="ShootMate conversation">
            <div className="panel-head">
              <div>
                <div className="panel-title"><span className="assistant-avatar"><Aperture size={15} /></span> ShootMate assistant</div>
                <div className="panel-subtitle">A thoughtful second brain for shoot day</div>
              </div>
              <div className="head-actions">
                <button className="icon-button" onClick={() => { setMessages(initialMessages); setPlan(null); setMobileView('chat'); notify('Started a fresh conversation.'); }} aria-label="Start a fresh conversation" data-testid="button-new-chat"><RotateCcw /></button>
              </div>
            </div>
            <div className="chat-flow" aria-live="polite" data-testid="conversation-messages">
              <div className="intro">
                <div className="intro-label"><Sparkles size={13} /> READY WHEN YOU ARE</div>
                <p>Build a shoot plan that works in the real world: the right gear, the moments to look for, and enough time to actually see them.</p>
              </div>
              {messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id} data-testid={`message-${message.role}-${message.id}`}>
                  {message.role === 'assistant' && <span className="message-mark"><Aperture /></span>}
                  <div>
                    <div className="bubble">{message.text}</div>
                    <div className="message-time">{message.role === 'assistant' ? 'ShootMate' : 'You'} · {message.timestamp}</div>
                  </div>
                </article>
              ))}
              {loading && <div className="message" data-testid="status-planning"><span className="message-mark"><Aperture /></span><div className="bubble"><div className="typing"><span /><span /><span /></div></div></div>}
              <div ref={messageEndRef} />
            </div>

            <div className="quick-wrap">
              <div className="quick-label">A good place to start</div>
              <div className="quick-grid">
                {quickActions.map(({ label, icon: Icon }) => (
                  <button className="quick-action" key={label} onClick={() => void sendPrompt(label)} disabled={loading} data-testid={`quick-action-${label.toLowerCase().replaceAll(' ', '-')}`}>
                    <span className="quick-icon"><Icon /></span><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <form className="composer" onSubmit={submit}>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKey} placeholder="What are you shooting next?" aria-label="Describe your shoot" rows={1} data-testid="input-shoot-prompt" />
              {draft.trim() && <button type="button" className="icon-button" aria-label="Clear message" onClick={() => setDraft('')} data-testid="button-clear-prompt"><X /></button>}
              <button className="send-button" type="submit" aria-label="Send message" disabled={!draft.trim() || loading} data-testid="button-send-prompt">{loading ? <span className="typing"><span /><span /><span /></span> : <ArrowUp />}</button>
            </form>
            <div className="composer-note">Enter to send · Shift + Enter for a new line</div>
          </section>

          <section className={`panel plan-panel ${mobileView !== 'plan' ? 'hidden-mobile' : ''}`} aria-label="Generated shoot plan">
            <div className="plan-top">
              <div className="plan-top-line">
                <div className="plan-heading"><Compass /> Your shoot plan</div>
                <span className="plan-state">{plan ? 'READY TO REFINE' : 'WAITING FOR A BRIEF'}</span>
              </div>
              <div className="plan-meta" data-testid="text-plan-status">{plan ? <><strong>{plan.shootType}</strong><span>·</span><span>{plan.checklist.length} gear essentials</span></> : <span>Your checklist, frames and timeline live here.</span>}</div>
            </div>
            {!plan ? (
              <div className="plan-body">
                <div className="plan-placeholder">
                  <div className="placeholder-art"><span className="placeholder-orbit" /><span className="placeholder-camera"><Camera /></span></div>
                  <h3>Your next shoot, thoughtfully mapped.</h3>
                  <p>Start with a shoot type or tell me what’s on your calendar. I’ll build a practical plan you can shape as you go.</p>
                  <div className="placeholder-hint">GEAR CHECKLIST · SHOT IDEAS · TIMELINE</div>
                </div>
              </div>
            ) : (
              <>
                <div className="plan-switcher" role="tablist" aria-label="Plan sections">
                  <button className={planView === 'checklist' ? 'selected' : ''} onClick={() => setPlanView('checklist')} role="tab" aria-selected={planView === 'checklist'} data-testid="tab-checklist"><CheckCheck /> Gear <span>{checkedCount}/{plan.checklist.length}</span></button>
                  <button className={planView === 'shots' ? 'selected' : ''} onClick={() => setPlanView('shots')} role="tab" aria-selected={planView === 'shots'} data-testid="tab-shot-list"><Image /> Shot list <span>{plan.shots.length}</span></button>
                  <button className={planView === 'schedule' ? 'selected' : ''} onClick={() => setPlanView('schedule')} role="tab" aria-selected={planView === 'schedule'} data-testid="tab-schedule"><Clock3 /> Timeline <span>{plan.schedule.length}</span></button>
                </div>
                <div className="plan-body" key={planView}>
                  {planView === 'checklist' && (
                    <div className="plan-section">
                      <div className="section-header">
                        <div className="section-label"><ListChecks /> Equipment checklist</div>
                        <span className="section-count">{completion}% READY</span>
                      </div>
                      <div className="progress-track" aria-label={`${completion}% of checklist complete`}><span style={{ width: `${completion}%` }} /></div>
                      <div className="check-list">
                        {plan.checklist.map((item) => (
                          <button className={`check-item ${item.checked ? 'checked' : ''}`} key={item.id} onClick={() => toggleCheck(item.id)} aria-pressed={item.checked} data-testid={`checklist-item-${item.id}`}>
                            <span className="check-square">{item.checked && <Check />}</span>
                            <span className="check-copy">{item.label}<span className="check-category">{item.category}</span></span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {planView === 'shots' && (
                    <div className="plan-section">
                      <div className="section-header"><div className="section-label"><Image /> Story-led frames</div><span className="section-count">{plan.shots.length} MOMENTS</span></div>
                      {plan.shots.map((shot, index) => <article className="shot-row" key={shot.id} data-testid={`shot-item-${shot.id}`}><span className="shot-number">{String(index + 1).padStart(2, '0')}</span><div><div className="shot-title">{shot.title}</div><div className="shot-moment">{shot.moment}</div><div className="shot-note">{shot.creativeNote}</div></div></article>)}
                    </div>
                  )}
                  {planView === 'schedule' && (
                    <div className="plan-section">
                      <div className="section-header"><div className="section-label"><Clock3 /> A little room to breathe</div><span className="section-count">{plan.schedule.length} STOPS</span></div>
                      <div className="timeline">{plan.schedule.map((item) => <article className="timeline-row" key={item.id} data-testid={`schedule-item-${item.id}`}><span className="timeline-time">{item.time}</span><span className="timeline-dot" /><div><div className="timeline-title">{item.title}</div><div className="timeline-detail">{item.detail}</div></div></article>)}</div>
                    </div>
                  )}
                  <div className="plan-actions">
                    {planView === 'checklist' ? <button className="soft-button" onClick={addChecklistItem} data-testid="button-add-checklist-item"><Plus /> Add an item</button> : <button className="soft-button" onClick={() => setPlanView('checklist')} data-testid="button-open-checklist"><ListChecks /> Gear checklist</button>}
                    {planView === 'checklist' ? <button className="soft-button" onClick={resetChecks} data-testid="button-reset-checklist"><RotateCcw /> Reset checks</button> : <button className="soft-button" onClick={() => setPlanView('schedule')} data-testid="button-open-timeline"><Clock3 /> Timeline</button>}
                    <button className="soft-button" onClick={() => void copyPlan()} data-testid="button-copy-plan"><Clipboard /> Copy plan</button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
      {toast && <div className="toast-message" role="status" data-testid="status-toast">{toast}</div>}
    </main>
  );
}

function NotFound() {
  return <main className="app-shell" style={{ display: 'grid', placeItems: 'center', padding: 24 }}><section className="panel" style={{ padding: 34, textAlign: 'center' }}><Aperture size={28} /><h1>That frame is out of view.</h1><Link href="/" data-testid="link-home">Back to your shoot desk</Link></section></main>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Switch>
          <Route path="/" component={Home} />
          <Route component={NotFound} />
        </Switch>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;