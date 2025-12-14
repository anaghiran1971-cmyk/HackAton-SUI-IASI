import React from "react";

export function Card(props: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">
            <span style={{ opacity: 0.9 }}>{props.icon ?? "✨"}</span>
            <span>{props.title}</span>
          </div>
          {props.subtitle ? <div className="cardSub">{props.subtitle}</div> : null}
        </div>
        {props.right}
      </div>
      <div className="cardBody">{props.children}</div>
    </div>
  );
}

export function Badge(props: { tone?: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls =
    props.tone === "ok" ? "badge badgeOk" : props.tone === "warn" ? "badge badgeWarn" : props.tone === "bad" ? "badge badgeBad" : "badge";
  return <span className={cls}>{props.children}</span>;
}
