<script setup lang="ts">
import { ref } from "vue";

const email = "yacvibes65@gmail.com";
const xUrl = "https://x.com";
const copiedType = ref<string | null>(null);

function copyToClipboard(text: string, type: string): void {
  navigator.clipboard.writeText(text).then(() => {
    copiedType.value = type;
    setTimeout(() => {
      if (copiedType.value === type) {
        copiedType.value = null;
      }
    }, 2500);
  });
}

function getMailtoUrl(subject: string, body: string): string {
  const encSubject = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body);
  return `mailto:${email}?subject=${encSubject}&body=${encBody}`;
}

const bugReportMailto = getMailtoUrl(
  "[DevMate Bug Report] Issue Description",
  `Hello DevMate Team,\n\nI encountered an issue / bug while using DevMate AI:\n\n- Language / File:\n- What happened:\n- What was expected:\n- Sample code (if applicable):\n\nThank you!`
);

const toolRequestMailto = getMailtoUrl(
  "[DevMate Tool Request] New Language / Feature Request",
  `Hello DevMate Team,\n\nI would like to request a new tool or language analyzer in DevMate AI:\n\n- Requested language / framework / tool:\n- Key rules or features you would like to see:\n- Why this would help your development workflow:\n\nThank you!`
);

const messageMeMailto = getMailtoUrl(
  "[DevMate Feedback] Suggestion & Message",
  `Hello DevMate Team,\n\nI have a suggestion / message regarding DevMate AI:\n\n`
);
</script>

<template>
  <div class="contact-view">
    <!-- Top Section: Two Huge Boxes -->
    <section class="huge-boxes-grid">
      <!-- Huge Box 1: X (Twitter) Account with White Link -->
      <div class="huge-card x-card">
        <div class="card-glow"></div>
        <div class="card-content">
          <div class="card-badge">
            <span class="pulse-dot"></span>
            <span>Official Channel</span>
          </div>

          <div class="card-icon-wrap x-icon-wrap">
            <svg class="x-logo" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>

          <div class="card-text">
            <h2>Connect on 𝕏</h2>
            <p>
              Follow our official 𝕏 (formerly Twitter) account for live product updates, engine releases, developer tips, and announcements.
            </p>
          </div>

          <div class="card-actions">
            <!-- White Link Attached to X Account -->
            <a
              :href="xUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="white-link-btn"
              title="Open X account in a new tab"
            >
              <svg class="btn-x-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Follow on 𝕏</span>
              <span class="arrow">↗</span>
            </a>

            <button
              class="secondary-action-btn"
              @click="copyToClipboard(xUrl, 'x')"
              :title="copiedType === 'x' ? 'Copied!' : 'Copy link to clipboard'"
            >
              <span>{{ copiedType === 'x' ? "✓ Copied" : "Copy Link" }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Huge Box 2: Direct Email Address -->
      <div class="huge-card email-card">
        <div class="card-glow email-glow"></div>
        <div class="card-content">
          <div class="card-badge email-badge">
            <span class="pulse-dot green-dot"></span>
            <span>Direct Inquiries</span>
          </div>

          <div class="card-icon-wrap email-icon-wrap">
            <span class="envelope-emoji">✉️</span>
          </div>

          <div class="card-text">
            <h2>Direct Email</h2>
            <p>
              Get in touch directly with our core engineering team for collaborations, enterprise support, questions, or custom integrations.
            </p>
          </div>

          <div class="email-address-chip" @click="copyToClipboard(email, 'main-email')">
            <span class="email-value">{{ email }}</span>
            <span class="chip-copy-hint">{{ copiedType === 'main-email' ? "✓ Copied" : "Copy" }}</span>
          </div>

          <div class="card-actions">
            <a :href="`mailto:${email}`" class="primary-email-btn" title="Send email via your mail client">
              <span>Send Email</span>
              <span class="arrow">→</span>
            </a>

            <button
              class="secondary-action-btn"
              @click="copyToClipboard(email, 'main-email')"
            >
              <span>{{ copiedType === 'main-email' ? "✓ Copied Email" : "Copy Address" }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Section: Three Rectangular Boxes -->
    <section class="triplet-section">
      <div class="section-heading">
        <h3>How Can We Help You?</h3>
        <p>Choose an option below to instantly compose a pre-formatted email to our engineering team.</p>
      </div>

      <div class="triplet-grid">
        <!-- Box 1: Report a Bug -->
        <div class="triplet-card bug-card">
          <div class="triplet-header">
            <div class="triplet-icon-box bug-icon-box">🐛</div>
            <div>
              <h4>Report a Bug</h4>
              <span class="triplet-tag">Technical Issues</span>
            </div>
          </div>

          <p class="triplet-desc">
            Found a false positive, parser glitch, missing error detection, or UI bug? Let us know so we can fix it swiftly.
          </p>

          <div class="triplet-footer">
            <a :href="bugReportMailto" class="btn-email-me" title="Email us regarding a bug">
              <span class="mail-icon">✉️</span>
              <span>Email Me</span>
              <span class="arrow">→</span>
            </a>
          </div>
        </div>

        <!-- Box 2: Request a Tool -->
        <div class="triplet-card tool-card">
          <div class="triplet-header">
            <div class="triplet-icon-box tool-icon-box">🛠️</div>
            <div>
              <h4>Request a Tool</h4>
              <span class="triplet-tag">Feature Requests</span>
            </div>
          </div>

          <p class="triplet-desc">
            Need support for a new language (Go, Rust, C++), custom AST linter rules, or CI/CD workflow integrations?
          </p>

          <div class="triplet-footer">
            <a :href="toolRequestMailto" class="btn-email-me" title="Email us to request a tool or feature">
              <span class="mail-icon">✉️</span>
              <span>Email Me</span>
              <span class="arrow">→</span>
            </a>
          </div>
        </div>

        <!-- Box 3: Suggest / Message Me -->
        <div class="triplet-card message-card">
          <div class="triplet-header">
            <div class="triplet-icon-box message-icon-box">💬</div>
            <div>
              <h4>Suggest / Message Me</h4>
              <span class="triplet-tag">Feedback & Ideas</span>
            </div>
          </div>

          <p class="triplet-desc">
            Share product suggestions, UX feedback, general thoughts, or just drop a message to say hello.
          </p>

          <div class="triplet-footer">
            <a :href="messageMeMailto" class="btn-email-me" title="Email us your suggestions or message">
              <span class="mail-icon">✉️</span>
              <span>Email Me</span>
              <span class="arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-view {
  display: grid;
  gap: 2.25rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.5rem 0 3rem;
}

/* ==========================================================================
   Top Section: Two Huge Boxes
   ========================================================================== */
.huge-boxes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.5rem;
}

.huge-card {
  position: relative;
  border-radius: 18px;
  background: rgba(14, 10, 26, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.22);
  padding: 2.2rem 2rem;
  overflow: hidden;
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.huge-card:hover {
  transform: translateY(-3px);
  border-color: rgba(168, 85, 247, 0.45);
  box-shadow: 0 16px 40px -8px rgba(139, 92, 246, 0.22);
}

.card-glow {
  position: absolute;
  top: -60px;
  right: -60px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
  pointer-events: none;
}

.email-glow {
  background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%);
}

.card-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.25rem;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
  width: fit-content;
}

.email-badge {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.3);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c084fc;
  box-shadow: 0 0 8px #c084fc;
}

.green-dot {
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}

.card-icon-wrap {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.2rem;
}

.x-icon-wrap {
  background: #ffffff;
  color: #000000;
  box-shadow: 0 6px 20px rgba(255, 255, 255, 0.25);
}

.x-logo {
  width: 30px;
  height: 30px;
}

.email-icon-wrap {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.envelope-emoji {
  font-size: 1.85rem;
}

.card-text h2 {
  font-size: 1.45rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 0.45rem 0;
  letter-spacing: -0.01em;
}

.card-text p {
  color: #94a3b8;
  font-size: 0.92rem;
  line-height: 1.55;
  margin: 0;
}

/* White Link Attached to X Account */
.white-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  background: #ffffff;
  color: #0b0717;
  font-size: 0.92rem;
  font-weight: 700;
  padding: 0.8rem 1.4rem;
  border-radius: 10px;
  text-decoration: none;
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.35);
  transition: all 0.2s ease;
}

.white-link-btn:hover {
  background: #f1f5f9;
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(255, 255, 255, 0.5);
}

.btn-x-icon {
  width: 17px;
  height: 17px;
}

.email-address-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.9rem;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
}

.email-address-chip:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(56, 189, 248, 0.35);
}

.email-value {
  color: #38bdf8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
  font-weight: 600;
}

.chip-copy-hint {
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 700;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: auto;
  flex-wrap: wrap;
}

.primary-email-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
  color: #0b0717;
  font-size: 0.92rem;
  font-weight: 700;
  padding: 0.8rem 1.4rem;
  border-radius: 10px;
  text-decoration: none;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4);
  transition: all 0.2s ease;
}

.primary-email-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(14, 165, 233, 0.6);
}

.secondary-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.8rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.arrow {
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.white-link-btn:hover .arrow,
.primary-email-btn:hover .arrow {
  transform: translateX(3px);
}

/* ==========================================================================
   Bottom Section: Three Rectangular Boxes
   ========================================================================== */
.triplet-section {
  display: grid;
  gap: 1.25rem;
}

.section-heading h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.3rem 0;
}

.section-heading p {
  color: #94a3b8;
  font-size: 0.88rem;
  margin: 0;
}

.triplet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 1.25rem;
}

.triplet-card {
  background: rgba(18, 14, 33, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 14px;
  padding: 1.6rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  backdrop-filter: blur(12px);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.triplet-card:hover {
  transform: translateY(-3px);
  border-color: rgba(168, 85, 247, 0.45);
  box-shadow: 0 10px 25px -4px rgba(139, 92, 246, 0.2);
}

.triplet-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.triplet-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  flex-shrink: 0;
}

.bug-icon-box {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.tool-icon-box {
  background: rgba(234, 179, 8, 0.15);
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.message-icon-box {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.triplet-header h4 {
  color: #f8fafc;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.15rem 0;
}

.triplet-tag {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 500;
}

.triplet-desc {
  color: #94a3b8;
  font-size: 0.86rem;
  line-height: 1.5;
  margin: 0;
  flex-grow: 1;
}

.triplet-footer {
  margin-top: auto;
  padding-top: 0.5rem;
}

/* "Email Me" button in the three boxes */
.btn-email-me {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.72rem 1rem;
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
  border: 1px solid rgba(139, 92, 246, 0.35);
  color: #f1f5f9;
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.btn-email-me:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
  border-color: transparent;
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45);
}

.mail-icon {
  font-size: 0.95rem;
}

.btn-email-me:hover .arrow {
  transform: translateX(3px);
}
</style>
