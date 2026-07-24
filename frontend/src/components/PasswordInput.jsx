import { useState } from 'react';

// Shared password field used on Login/Register/ForgotPassword - adds an
// eye/eye-off toggle button so the user can reveal what they've typed
// without changing anything about validation, required-ness, etc. Every
// prop other than the ones we read below is passed straight through to
// the underlying <input>, so it's a drop-in replacement for a plain
// `<input type="password" .../>`.
export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ember-50/40 hover:text-ember-400 transition-colors"
      >
        {visible ? (
          // Eye-off icon
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
            <path d="M12 6.5c-5 0-9.27 3.11-11 7.5 1.06 2.7 2.97 4.99 5.41 6.53l-1.7 1.7 1.06 1.06L20.94 3.12 19.88 2.06l-2.79 2.79C15.6 4.36 13.86 3.9 12 3.9c-.86 0-1.7.09-2.5.27l1.61 1.61c.29-.04.59-.06.89-.06 3.79 0 7.17 2.13 8.82 5.28a10.4 10.4 0 0 1-2.32 3.04l1.42 1.42a12.4 12.4 0 0 0 2.98-4.46C21.27 9.61 17 6.5 12 6.5Zm-.55 2.52 3.03 3.03.02-.22a2.5 2.5 0 0 0-2.5-2.5l-.55.02ZM4.83 4.46 3.4 5.88l2.79 2.79A12.36 12.36 0 0 0 3.1 14c1.73 4.39 6 7.5 11 7.5 1.55 0 3.02-.3 4.36-.84l2.24 2.24 1.42-1.42L4.83 4.46Zm5.02 5.02 1.6 1.6a2.5 2.5 0 0 0 2.47 2.47l1.6 1.6a4.5 4.5 0 0 1-5.67-5.67Z" />
          </svg>
        ) : (
          // Eye icon
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
            <path d="M12 4.5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
