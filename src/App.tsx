import { Footer } from './components/layout/Footer';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Contrast</h1>
        <p className="mt-2 text-slate-600">Compare any documents. Decide with evidence.</p>
      </main>
      <Footer />
    </div>
  );
}
