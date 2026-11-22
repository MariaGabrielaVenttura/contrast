import { UploadCloud } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toasts';
import { cx } from '../../components/ui/cx';

export const DEMO_UPLOAD_MESSAGE = "Demo mode: file analysis isn't available in this prototype. Try a sample scenario.";

export function UploadDropzone() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const reject = () => {
    toast(DEMO_UPLOAD_MESSAGE, 'info');
    if (inputRef.current) inputRef.current.value = '';
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    reject();
  };

  return (
    <div
      data-testid="upload-dropzone"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cx(
        'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
        over ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50',
      )}
    >
      <UploadCloud className="size-8 text-indigo-600" aria-hidden />
      <div>
        <p className="font-medium text-slate-900">{over ? 'Drop to try' : 'Drop 2–4 documents here'}</p>
        <p className="text-sm text-slate-500">PDF, DOCX, XLSX or CSV</p>
      </div>
      <Button size="sm" onClick={() => inputRef.current?.click()}>
        Select files
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.csv"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) reject();
        }}
      />
    </div>
  );
}
