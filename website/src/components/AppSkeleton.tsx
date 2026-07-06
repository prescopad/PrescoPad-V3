import Skeleton from './Skeleton';
import './skeleton.css';

export default function AppSkeleton() {
  return (
    <div className="app-skeleton">
      <aside className="app-skeleton-sidebar">
        <Skeleton width={140} height={28} radius={8} style={{ marginBottom: 12 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={14} radius={4} />
        ))}
      </aside>
      <main className="app-skeleton-content">
        <Skeleton width={220} height={28} radius={8} />
        <div className="app-skeleton-row">
          <Skeleton height={80} radius={12} />
          <Skeleton height={80} radius={12} />
          <Skeleton height={80} radius={12} />
          <Skeleton height={80} radius={12} />
        </div>
        <Skeleton height={56} radius={12} />
        <Skeleton height={56} radius={12} />
        <Skeleton height={56} radius={12} />
        <Skeleton height={56} radius={12} />
      </main>
    </div>
  );
}
