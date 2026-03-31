import Link from "next/link";

export const EVENT_RUN_FLOW_STEPS = [
  { id: "opening", label: "Opening", href: "/idle" },
  { id: "formation", label: "Formation", href: "/formation" },
  { id: "arena", label: "Live race", href: "/arena" }
] as const;

export type EventRunFlowStepId = (typeof EVENT_RUN_FLOW_STEPS)[number]["id"];

export function EventRunFlowNav({ current }: { current: EventRunFlowStepId }) {
  const currentIndex = EVENT_RUN_FLOW_STEPS.findIndex((s) => s.id === current);

  return (
    <nav className="event-run-flow" aria-label="Event run sequence">
      <ol className="event-run-flow-list">
        {EVENT_RUN_FLOW_STEPS.map((step, index) => {
          const isCurrent = step.id === current;
          const isPast = index < currentIndex;
          return (
            <li key={step.id} className="event-run-flow-item">
              {isCurrent ? (
                <span className="event-run-flow-step event-run-flow-step--current" aria-current="step">
                  {step.label}
                </span>
              ) : (
                <Link
                  href={step.href}
                  className={`event-run-flow-step${isPast ? " event-run-flow-step--past" : " event-run-flow-step--ahead"}`}
                >
                  {step.label}
                </Link>
              )}
              {index < EVENT_RUN_FLOW_STEPS.length - 1 ? (
                <span className="event-run-flow-chevron" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
