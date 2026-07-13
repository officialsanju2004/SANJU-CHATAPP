import { useState } from 'react';

export default function PollBubble({ message, mine, currentUserId, onVote }) {
  const [selected, setSelected] = useState([]);
  const poll = message.poll;
  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
  const myVotedIndexes = poll.options
    .map((o, i) => (o.votes.some((v) => v === currentUserId || v?._id === currentUserId) ? i : -1))
    .filter((i) => i >= 0);
  const hasVoted = myVotedIndexes.length > 0;

  const toggleOption = (i) => {
    if (poll.allowMultiple) {
      const next = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i];
      setSelected(next);
      onVote(message._id, next);
    } else {
      setSelected([i]);
      onVote(message._id, [i]);
    }
  };

  const activeIndexes = selected.length > 0 || !hasVoted ? selected : myVotedIndexes;

  return (
    <div className="min-w-[220px] max-w-[260px]">
      <div className="flex items-center gap-1.5 mb-2">
        <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current opacity-70 shrink-0">
          <path d="M4 20h4V10H4v10Zm6 0h4V4h-4v16Zm6 0h4v-7h-4v7Z" />
        </svg>
        <p className="font-semibold text-sm">{poll.question}</p>
      </div>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          const isMine = myVotedIndexes.includes(i) || activeIndexes.includes(i);
          return (
            <button
              key={i}
              onClick={() => toggleOption(i)}
              className={`relative w-full text-left rounded-lg overflow-hidden border px-2.5 py-2 text-xs ${
                isMine
                  ? mine
                    ? 'border-void-950/50'
                    : 'border-ember-500/70'
                  : mine
                  ? 'border-void-950/20'
                  : 'border-surface-border'
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${mine ? 'bg-void-950/10' : 'bg-ember-500/15'}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="truncate">{opt.text}</span>
                <span className="opacity-60 shrink-0">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] opacity-60 mt-1.5">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''} {poll.allowMultiple && '· multiple answers'}
      </p>
    </div>
  );
}
