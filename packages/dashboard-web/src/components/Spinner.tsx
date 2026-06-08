export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="spinner inline-block rounded-full border-2 border-on-surface-variant border-t-transparent"
      style={{ width: size, height: size }}
      aria-label="loading"
    />
  );
}
