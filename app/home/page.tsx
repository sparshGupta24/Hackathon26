import Link from "next/link";
import { EventBrandLogos } from "@/components/EventBrandLogos";

export default function EventHomePage() {
  return (
    <main className="page-shell event-home">
      <div className="event-home-inner">
        <div className="event-home-brand">
          <EventBrandLogos variant="home" />
        </div>
        <nav className="event-home-ctas" aria-label="Event destinations">
          <Link href="/idle" className="btn-primary event-home-cta">
            Start event
          </Link>
          <Link href="/idle" className="btn-secondary event-home-cta">
            Opening sequence
          </Link>
          <Link href="/volunteers" className="btn-secondary event-home-cta">
            Volunteer Portal
          </Link>
          <Link href="/vote" className="btn-secondary event-home-cta">
            Voting Portal
          </Link>
          <Link href="/voteadmin" className="btn-secondary event-home-cta">
            Vote admin
          </Link>
          <Link href="/registrations" className="btn-secondary event-home-cta">
            Registration
          </Link>
        </nav>
      </div>
    </main>
  );
}
