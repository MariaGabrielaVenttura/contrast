export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Prototype by{' '}
          <a
            href="https://www.linkedin.com/in/mariagabrielaventura"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-700 underline-offset-2 hover:underline"
          >
            Maria Gabriela Ventura
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        <p>Simulated AI results and fictional data.</p>
      </div>
    </footer>
  );
}
