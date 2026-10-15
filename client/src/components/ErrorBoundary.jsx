import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/** Last line of defence: a render error shows a recoverable message instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('UI error:', error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle className="h-8 w-8" /></div>
        <h1 className="mt-6 text-2xl font-bold">Something went wrong on this screen</h1>
        <p className="mt-2 max-w-md text-muted">Your data is safe. Reload the page, or go back to the dashboard and try again.</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => window.location.reload()} className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">Reload page</button>
          <a href="/" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Go to dashboard</a>
        </div>
      </div>
    );
  }
}
