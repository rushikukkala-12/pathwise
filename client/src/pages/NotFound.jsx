import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700"><Compass className="h-8 w-8" /></div>
      <h1 className="mt-6 text-3xl font-bold">This route doesn't exist</h1>
      <p className="mt-2 text-muted">The page you're looking for was moved or never existed.</p>
      <Link to="/" className="mt-6"><Button>Back to dashboard</Button></Link>
    </div>
  );
}
