import { Component } from "react";

// Last-resort error surface: a calm card instead of a white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("App error boundary:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="shell">
        <h1>Something went sideways</h1>
        <p className="tagline">Your data is safe. Reload the page to pick up where you left off.</p>
        <p>
          <button className="primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </p>
      </main>
    );
  }
}
