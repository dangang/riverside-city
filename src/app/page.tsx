import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing-card">
        <h1>Riverside</h1>
        <p>
          Build a city. Watch people live in it. A short, satisfying living-city
          session in your browser.
        </p>
        <div className="landing-actions">
          <Link href="/play" className="game-btn primary full">
            Play now
          </Link>
          <Link href="/signup" className="game-btn full">
            Sign up to save your city
          </Link>
          <Link href="/login" className="game-btn full">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
