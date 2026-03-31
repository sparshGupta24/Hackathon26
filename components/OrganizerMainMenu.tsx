import Link from "next/link";

export function OrganizerMainMenu() {
  return (
    <main className="page-shell event-home">
      <div className="event-home-inner">
        <header className="hero compact event-home-brand">
          <div>
            <p className="kicker">Organizer</p>
            <h1>Main menu</h1>
            <p className="muted">
              Jump to the main event flows. Same destinations as the public home screen, grouped for pit-wall use.
            </p>
          </div>
        </header>
        <nav className="event-home-ctas" aria-label="Organizer destinations">
          <Link href="/home" className="btn-secondary event-home-cta">
            Event home
          </Link>
          <Link href="/registrations" className="btn-primary event-home-cta">
            Team registration
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
          <Link href="/arena" className="btn-secondary event-home-cta">
            Arena display
          </Link>
        </nav>
      </div>
    </main>
  );
}
