export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={small ? 20 : 26}
        height={small ? 20 : 26}
        viewBox="0 0 26 26"
        fill="none"
        aria-hidden
      >
        {/* an ear-shaped listening mark: nested arcs opening to the right */}
        <path
          d="M7 5.5A8.5 8.5 0 0 1 20 13c0 3-1.6 4.3-3 5.2-1.1.7-1.7 1.2-1.7 2.6"
          stroke="var(--color-brand)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M11 10.5a3.6 3.6 0 0 1 5.2 3.1"
          stroke="var(--color-brand)"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="6.5" cy="19" r="2.6" fill="var(--color-brand)" />
      </svg>
      <span
        className={`font-semibold tracking-tight ${small ? "text-base" : "text-xl"}`}
      >
        Earpiece
      </span>
    </div>
  );
}
