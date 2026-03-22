import "./legal.scss";

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <span className="legal-logo">♠ 52 Patta</span>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-meta">Last updated: March 22, 2026</p>
        </div>

        <div className="legal-body">
          <p className="legal-intro">
            52 Patta ("we", "us", "our") is a multiplayer card game. This Privacy
            Policy explains what information we collect when you use our mobile app
            or website (<strong>52patta.in</strong>), how we use it, and your rights
            regarding your data.
          </p>

          <Section title="1. Information We Collect">
            <Subsection title="Account Information">
              When you register or sign in, we collect:
              <ul>
                <li>Email address</li>
                <li>Username (chosen by you)</li>
                <li>Avatar (created in-app by you)</li>
              </ul>
            </Subsection>
            <Subsection title="OAuth Sign-In (Google / Facebook)">
              If you choose to sign in with Google or Facebook, we receive your
              name and email address from the respective provider. We do not
              receive or store your OAuth passwords. You can unlink these
              providers from your profile at any time.
            </Subsection>
            <Subsection title="Gameplay Data">
              We store game activity associated with your account — such as rooms
              you participated in, scores, and game history — to provide the
              multiplayer experience.
            </Subsection>
            <Subsection title="Technical Data">
              We automatically collect standard server logs including IP address,
              device type, browser/app version, and connection timestamps. This
              data is used solely for security, debugging, and service improvement.
            </Subsection>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li>To create and manage your account</li>
              <li>To enable real-time multiplayer gameplay</li>
              <li>To display your username and avatar to other players in the same room</li>
              <li>To send transactional emails (e.g., password reset) — we do not send marketing emails</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To improve and debug the app</li>
            </ul>
          </Section>

          <Section title="3. Data Sharing">
            <p>We do not sell, rent, or trade your personal information.</p>
            <p>We share data only in the following limited circumstances:</p>
            <ul>
              <li>
                <strong>OAuth Providers:</strong> Google and Facebook receive only
                the OAuth callback necessary to authenticate you. We do not send
                them any additional data.
              </li>
              <li>
                <strong>Infrastructure Providers:</strong> We use hosting and cloud
                infrastructure providers to operate the service. These providers
                process data only on our behalf and under strict data-processing
                agreements.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose data if
                required by law or to protect the rights and safety of our users.
              </li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p>
              We retain your account data for as long as your account is active.
              Gameplay logs are retained for up to 90 days for debugging purposes,
              after which they are deleted or anonymised.
            </p>
            <p>
              You may request deletion of your account and associated data at any
              time by contacting us at{" "}
              <a href="mailto:privacy@52patta.in">privacy@52patta.in</a>. We will
              process deletion requests within 30 days.
            </p>
          </Section>

          <Section title="5. Cookies &amp; Local Storage">
            <p>
              Our website uses browser local storage to maintain your login
              session. We do not use third-party advertising or tracking cookies.
            </p>
          </Section>

          <Section title="6. Children's Privacy">
            <p>
              52 Patta is not directed to children under the age of 13. We do not
              knowingly collect personal information from children under 13. If we
              learn that we have inadvertently collected such information, we will
              delete it promptly. If you believe a child under 13 has provided us
              with personal data, please contact us at{" "}
              <a href="mailto:privacy@52patta.in">privacy@52patta.in</a>.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for optional processing</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@52patta.in">privacy@52patta.in</a>.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We use HTTPS (TLS) for all data in transit. Passwords are hashed and
              never stored in plain text. We regularly review our security practices.
              However, no internet transmission is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. The "Last
              updated" date at the top of this page reflects the most recent
              revision. Continued use of the app after changes constitutes
              acceptance of the updated policy.
            </p>
          </Section>

          <Section title="10. Contact Us">
            <p>
              For any privacy-related questions or requests, please reach out to us
              at:{" "}
              <a href="mailto:privacy@52patta.in">privacy@52patta.in</a>
            </p>
          </Section>
        </div>

        <div className="legal-footer">
          <a href="/">← Back to 52 Patta</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="legal-section">
      <h2 className="legal-section-title">{title}</h2>
      {children}
    </section>
  );
}

function Subsection({ title, children }) {
  return (
    <div className="legal-subsection">
      <h3 className="legal-subsection-title">{title}</h3>
      <div>{children}</div>
    </div>
  );
}
