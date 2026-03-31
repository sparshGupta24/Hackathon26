import Image from "next/image";
import Link from "next/link";
import { EventBrandLogos } from "@/components/EventBrandLogos";

export type SessionAlertVisual = "brain" | "cup" | "logo" | "trophy" | "flag";

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    </svg>
  );
}

function CupIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
      <path d="M6 2v2" />
      <path d="M10 2v2" />
      <path d="M14 2v2" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function SessionAlertSlide({
  title,
  subtitle,
  visual,
  visualAriaLabel,
  nextHref
}: {
  title: string;
  subtitle?: string;
  visual: SessionAlertVisual;
  visualAriaLabel: string;
  /** Next step in the run of show (required — do not default to /home). */
  nextHref: string;
}) {
  return (
    <main className="page-shell session-alert-1">
      <article className="session-alert-1-card">
        <div className="session-alert-1-card__body">
          <div className="session-alert-1-card__titles">
            <h1 className="session-alert-1-card__title">{title}</h1>
            {subtitle ? <p className="session-alert-1-card__subtitle">{subtitle}</p> : null}
          </div>
          <div className="session-alert-1-card__visual">
            <div className="session-alert-1-icon-frame" role="img" aria-label={visualAriaLabel}>
              {visual === "brain" ? <BrainIcon className="session-alert-1-brain-icon" /> : null}
              {visual === "cup" ? <CupIcon className="session-alert-1-brain-icon" /> : null}
              {visual === "trophy" ? <TrophyIcon className="session-alert-1-brain-icon" /> : null}
              {visual === "logo" ? <EventBrandLogos variant="sessionSlide" /> : null}
              {visual === "flag" ? (
                <Image
                  src="/chequeredflag.png"
                  alt=""
                  width={160}
                  height={100}
                  className="session-alert-1-frame-flag"
                  priority
                  sizes="200px"
                />
              ) : null}
            </div>
          </div>
          <Link href={nextHref} className="session-alert-1-next" aria-label="Next">
            Next
          </Link>
        </div>
      </article>
    </main>
  );
}
