import { Outlet } from 'react-router-dom';

export default function FullBleedLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '24px 32px' }}>
      <Outlet />
    </div>
  );
}
