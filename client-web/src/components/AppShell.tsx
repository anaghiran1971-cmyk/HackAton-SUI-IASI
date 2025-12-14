import React from "react";

export function AppShell(props: {
  left: React.ReactNode;
  right: React.ReactNode;
  topRight: React.ReactNode;
  walletInfo: React.ReactNode;
}) {
  return (
    <div className="container">
      <div className="shell">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <h1>AI Copilot Sui</h1>
              <p>Chat + tranzacții + risk rails (non-custodial)</p>
            </div>
          </div>

          <div className="pills">
            <span className="pill">✅ Wallet semnează local</span>
            <span className="pill">🛡️ Safe Mode</span>
            <span className="pill">🔎 Risk preview</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>{props.walletInfo}</div>
            <div>{props.topRight}</div>
          </div>
        </div>

        <div className="grid">
          <div>{props.left}</div>
          <div>{props.right}</div>
        </div>
      </div>
    </div>
  );
}
