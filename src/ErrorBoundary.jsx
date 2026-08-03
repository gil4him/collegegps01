import { Component } from "react";
import { useI18n } from "./i18n/index.jsx";

function Fallback() {
  const { t } = useI18n();
  return (
    <main className="shell">
      <h1>{t("boundary.title")}</h1>
      <p className="tagline">{t("boundary.sub")}</p>
      <p>
        <button className="primary" onClick={() => window.location.reload()}>
          {t("boundary.reload")}
        </button>
      </p>
    </main>
  );
}

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
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
