import { SCENERIES, sceneryUnlocked } from "@/lib/adventure";
import { SKINS } from "@/lib/engagement";
import type { Progress } from "@/lib/progress";
import { RACE_TARGETS, THEMES, type Settings } from "@/lib/settings";
import { ninjaFor } from "@/lib/ninjas";
import InstallPrompt from "../InstallPrompt";

interface Props {
  settings: Settings;
  progress: Progress;
  onChange: (patch: Partial<Settings>) => void;
  onResetProgress: () => void;
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span className="setting-text">
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
      </span>
      <input
        type="checkbox"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function SettingsPanel({ settings, progress, onChange, onResetProgress }: Props) {
  return (
    <div className="settings">
      <fieldset className="setting-group">
        <legend>Theme</legend>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`theme-card theme-card-${t.id} ${settings.theme === t.id ? "theme-card-active" : ""}`}
              onClick={() => onChange({ theme: t.id })}
              aria-pressed={settings.theme === t.id}
            >
              <span className="theme-swatch" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <strong>{t.name}</strong>
              <span>{t.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="setting-group">
        <legend>Board skin</legend>
        <div className="theme-grid">
          {SKINS.map((sk) => {
            const unlocked = sk.unlocked(progress);
            return (
              <button
                key={sk.id}
                type="button"
                className={`theme-card skin-card skin-card-${sk.id} ${settings.skin === sk.id ? "theme-card-active" : ""} ${unlocked ? "" : "skin-locked"}`}
                onClick={() => unlocked && onChange({ skin: sk.id })}
                aria-pressed={settings.skin === sk.id}
                disabled={!unlocked}
                title={unlocked ? sk.blurb : sk.requirement}
              >
                <span className="skin-swatch" aria-hidden="true" />
                <strong>{sk.name}</strong>
                <span>{unlocked ? sk.blurb : `🔒 ${sk.requirement}`}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="setting-group">
        <legend>Dojo backdrop</legend>
        <p className="muted small">Earn new training grounds by completing Adventure chapters.</p>
        <div className="theme-grid">
          {SCENERIES.map((scene) => { const unlocked=sceneryUnlocked(progress,scene.id); return (
            <button key={scene.id} className={`theme-card scenery-choice scenery-${scene.id} ${settings.scenery===scene.id ? "theme-card-active" : ""}`} disabled={!unlocked} aria-pressed={settings.scenery===scene.id} onClick={()=>onChange({scenery:scene.id})}>
              <span className="scenery-preview" aria-hidden="true" /><strong>{scene.name}</strong><span>{unlocked ? "Ready to equip" : scene.description}</span>
            </button>
          )})}
        </div>
      </fieldset>
      <fieldset className="setting-group">
        <legend>Feel</legend>
        <Toggle
          label="Sound effects"
          hint="Slides, merges and unlock chimes"
          checked={settings.sound}
          onChange={(v) => onChange({ sound: v })}
        />
        <Toggle
          label="Haptics"
          hint="A small buzz on merges (phones only)"
          checked={settings.haptics}
          onChange={(v) => onChange({ haptics: v })}
        />
      </fieldset>

      <fieldset className="setting-group">
        <legend>Rules</legend>
        <p className="muted small">Rule changes apply to the next new game.</p>
        <Toggle
          label="Limited undos"
          hint="3 undos per game instead of unlimited"
          checked={settings.undoLimit !== -1}
          onChange={(v) => onChange({ undoLimit: v ? 3 : -1 })}
        />
        <Toggle
          label="Smoke Bomb tiles"
          hint="Rare wildcard that merges with anything (never in Daily)"
          checked={settings.wasabi}
          onChange={(v) => onChange({ wasabi: v })}
        />
      </fieldset>

      <fieldset className="setting-group">
        <legend>Global leaderboard</legend>
        <label className="setting-row setting-row-input">
          <span className="setting-text">
            <strong>Player name</strong>
            <span>Shown next to your scores worldwide</span>
          </span>
          <input
            className="input"
            type="text"
            maxLength={16}
            value={settings.playerName}
            placeholder="Anonymous ninja"
            onChange={(e) => onChange({ playerName: e.target.value })}
          />
        </label>
        <Toggle
          label="Submit scores"
          hint="Offer to post finished games to the global board"
          checked={settings.online}
          onChange={(v) => onChange({ online: v })}
        />
      </fieldset>

      <fieldset className="setting-group">
        <legend>Race</legend>
        <div className="setting-row">
          <span className="setting-text">
            <strong>Race target</strong>
            <span>First player to make this ninja wins</span>
          </span>
          <div className="segmented">
            {RACE_TARGETS.map((t) => (
              <button
                key={t}
                type="button"
                className={settings.raceTarget === t ? "seg-active" : ""}
                onClick={() => onChange({ raceTarget: t })}
                title={ninjaFor(t).name}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="setting-group">
        <legend>App</legend>
        <InstallPrompt eligible inline />
      </fieldset>

      <fieldset className="setting-group">
        <legend>Data</legend>
        <p className="muted small">
          Everything is stored in this browser only. Resetting clears stats, collection,
          achievements, leaderboard and best scores.
        </p>
        <button type="button" className="btn btn-danger" onClick={onResetProgress}>
          Reset all progress
        </button>
      </fieldset>
    </div>
  );
}
