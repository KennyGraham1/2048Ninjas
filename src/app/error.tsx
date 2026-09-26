"use client";

import Logo from "@/components/Logo";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page">
      <div className="game" style={{ alignItems: "center", textAlign: "center", paddingTop: 40 }}>
        <Logo className="hero-art hero-logo" />
        <h1 className="title" style={{ fontSize: 24 }}>
          Something went wrong in the dojo
        </h1>
        <p className="muted">Your progress is saved in this browser. Try again, or reload the page.</p>
        <div className="overlay-buttons">
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <button className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    </main>
  );
}
