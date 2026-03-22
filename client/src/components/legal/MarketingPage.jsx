import "./legal.scss";

export default function MarketingPage() {
  return (
    <div className="marketing-page">
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="mkt-nav">
        <span className="mkt-nav-logo">♠ 52 Patta</span>
        <div className="mkt-nav-links">
          <a href="/privacy" className="mkt-nav-link">Privacy</a>
          <a href="/login" className="mkt-nav-cta">Play Now</a>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header className="mkt-hero">
        <div className="mkt-hero-suits" aria-hidden="true">
          <span>♠</span><span>♥</span><span>♦</span><span>♣</span>
        </div>
        <h1 className="mkt-hero-title">52 Patta</h1>
        <p className="mkt-hero-tagline">
          The classic Indian card game — now multiplayer, online, and in your pocket.
        </p>
        <div className="mkt-hero-actions">
          <a href="/login" className="mkt-btn mkt-btn-primary">Play in Browser</a>
          <a
            href="https://apps.apple.com/app/52-patta/id6744485662"
            className="mkt-btn mkt-btn-store"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="mkt-store-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            App Store
          </a>
        </div>
      </header>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="mkt-features">
        <div className="mkt-features-grid">
          <Feature
            icon="🃏"
            title="Kaliteri & Judgement"
            desc="Play both variants of the beloved card game with friends or strangers."
          />
          <Feature
            icon="⚡"
            title="Real-Time Multiplayer"
            desc="WebSocket-powered gameplay — every card play feels instant."
          />
          <Feature
            icon="🎨"
            title="Custom Avatars"
            desc="Build a unique avatar and bring your personality to the table."
          />
          <Feature
            icon="📱"
            title="iOS App"
            desc="Play on the go with our native iOS app, available on the App Store."
          />
          <Feature
            icon="🔒"
            title="Private Rooms"
            desc="Create a room, share a code, and play only with people you invite."
          />
          <Feature
            icon="🏆"
            title="Score Tracking"
            desc="Live scoreboards and per-round history across full game series."
          />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="mkt-footer">
        <span className="mkt-footer-logo">♠ 52 Patta</span>
        <div className="mkt-footer-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="mailto:hello@52patta.in">Contact</a>
        </div>
        <p className="mkt-footer-copy">© {new Date().getFullYear()} 52 Patta. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="mkt-feature-card">
      <span className="mkt-feature-icon" aria-hidden="true">{icon}</span>
      <h3 className="mkt-feature-title">{title}</h3>
      <p className="mkt-feature-desc">{desc}</p>
    </div>
  );
}
