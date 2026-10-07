import React, { useState, useEffect } from 'react';
import { CheckSquare, Download, Check, AlertCircle } from 'lucide-react';
import { inspectAndFillPdfForm } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import confetti from 'canvas-confetti';

interface FormsWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

export const FormsWorkspace: React.FC<FormsWorkspaceProps> = ({ pdfBuffer, fileName }) => {
  const [fields, setFields] = useState<{ name: string; type: string; value: string }[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { fields: detectedFields } = await inspectAndFillPdfForm(pdfBuffer);
        if (mounted) {
          setFields(detectedFields);
          const initialValues: Record<string, string | boolean> = {};
          for (const f of detectedFields) {
            initialValues[f.name] = f.value || '';
          }
          setFormValues(initialValues);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pdfBuffer]);

  const handleValueChange = (name: string, val: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [name]: val }));
  };

  const handleSaveFilled = async () => {
    try {
      setProcessing(true);
      const { updatedBuffer } = await inspectAndFillPdfForm(pdfBuffer, formValues);
      downloadUint8Array(updatedBuffer, fileName.replace(/\.pdf$/i, '_filled.pdf'));
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Error updating form: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-neutral-600">Detecting interactive PDF form fields...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            Interactive PDF Form Fields
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {fields.length} detected
            </span>
          </h4>
          <p className="text-xs text-neutral-500">
            Fill interactive form fields directly in your browser without uploading to any server.
          </p>
        </div>

        <button
          onClick={handleSaveFilled}
          disabled={processing || fields.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white shadow-sm transition-all"
        >
          {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
          {processing ? 'Generating...' : done ? 'Downloaded!' : 'Save & Download Filled PDF'}
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="p-12 text-center bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
          <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
          <h5 className="font-semibold text-neutral-800 text-sm">No Interactive AcroForm Fields Detected</h5>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            This PDF document appears to be static or flat. You can use the <strong>Edit PDF</strong> or{' '}
            <strong>Sign PDF</strong> tools to add text annotations, checkmarks, and signatures on any page!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
          {fields.map((field) => {
            const isCheckbox = field.type.toLowerCase().includes('check') || field.type.toLowerCase().includes('radio');
            const currentValue = formValues[field.name];

            return (
              <div
                key={field.name}
                className="p-4 rounded-xl border border-neutral-200 bg-white shadow-xs space-y-2 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-800 truncate max-w-[200px]" title={field.name}>
                    {field.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono uppercase bg-neutral-100 px-1.5 py-0.5 rounded">
                    {field.type}
                  </span>
                </div>

                {isCheckbox ? (
                  <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(currentValue)}
                      onChange={(e) => handleValueChange(field.name, e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900 border-neutral-300 focus:ring-0"
                    />
                    <span>Checked</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={typeof currentValue === 'string' ? currentValue : ''}
                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                    placeholder={`Enter ${field.name}...`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
