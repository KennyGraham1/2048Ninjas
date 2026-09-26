"use client";

import { useEffect, useState } from "react";
import { loadJson, saveJson } from "@/lib/storage";
import Logo from "./Logo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Kind = "native" | "ios" | null;

interface Props {
  /** Only offer once the player has finished at least one game. */
  eligible: boolean;
  /** Compact variant for the Settings sheet: always visible, never auto-dismissed. */
  inline?: boolean;
}

/** Optional "add to home screen" offer. The game works identically without it. */
export default function InstallPrompt({ eligible, inline = false }: Props) {
  const [kind, setKind] = useState<Kind>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const isIosHint = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (!inline && (!eligible || loadJson("install-dismissed", false))) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setKind("native");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // iOS Safari never fires beforeinstallprompt; show manual steps after a short delay.
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isIos && coarse) timer = setTimeout(() => setKind("ios"), 1500);
    if (inline && !isIos) timer = setTimeout(() => setKind((k) => k ?? "native"), 0);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) clearTimeout(timer);
    };
  }, [eligible, inline, isIosHint]);

  const dismiss = () => {
    saveJson("install-dismissed", true);
    setKind(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setKind(null);
    else dismiss();
  };

  if (!kind) return null;
  if (inline) {
    return (
      <div className="setting-row">
        <span className="setting-text">
          <strong>Install as an app</strong>
          <span>
            {kind === "ios"
              ? "In Safari: tap Share, then Add to Home Screen."
              : deferred
                ? "Home-screen icon, full screen, works offline. Optional."
                : "Your browser will offer this once the page is served over https."}
          </span>
        </span>
        {kind === "native" && deferred && (
          <button className="btn" onClick={install}>
            Install
          </button>
        )}
      </div>
    );
  }


  return (
    <div className="install" role="region" aria-label="Install the app">
      <Logo className="install-logo" />
      <div className="install-text">
        <strong>Play full-screen</strong>
        {kind === "native" ? (
          <span>Optional: add a home-screen icon and play offline. Nothing to download.</span>
        ) : (
          <span>
            Optional: tap <b>Share</b> then <b>Add to Home Screen</b> for a full-screen, offline app.
          </span>
        )}
      </div>
      <div className="install-actions">
        {kind === "native" && (
          <button className="btn btn-primary" onClick={install}>
            Install
          </button>
        )}
        <button className="icon-btn" onClick={dismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
