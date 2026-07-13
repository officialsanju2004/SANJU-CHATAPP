import { useState } from 'react';

export default function PollComposerModal({ onClose, onSend }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState('');

  const updateOption = (i, value) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  };

  const addOption = () => {
    if (options.length < 10) setOptions((prev) => [...prev, '']);
  };

  const removeOption = (i) => {
    if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSend = () => {
    setError('');
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return setError('Add a question');
    if (cleanOptions.length < 2) return setError('Add at least 2 options');

    onSend({ question: question.trim(), options: cleanOptions, allowMultiple });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn max-h-[85vh] overflow-y-auto scrollbar-ember">
        <p className="font-display font-semibold text-ember-50 mb-4">New poll</p>

        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question"
          className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-ember-500 mb-3"
        />

        <div className="space-y-2 mb-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 bg-void border border-surface-border rounded-lg px-3 py-2 text-sm text-ember-50 outline-none focus:border-ember-500"
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} className="text-ember-50/40 hover:text-red-400 p-1">
                  <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current">
                    <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 10 && (
          <button onClick={addOption} className="text-sm text-ember-400 hover:text-ember-300 font-medium mb-3">
            + Add option
          </button>
        )}

        <label className="flex items-center gap-2 text-sm text-ember-50/70 mb-4">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="accent-ember-500"
          />
          Allow multiple answers
        </label>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="flex-1 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950"
          >
            Send poll
          </button>
        </div>
      </div>
    </div>
  );
}
