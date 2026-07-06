import './pageLoader.css';

interface PageLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export default function PageLoader({ label = 'Loading...', fullScreen = false }: PageLoaderProps) {
  return (
    <div className={`page-loader${fullScreen ? ' full-screen' : ''}`}>
      <div className="spinner" />
      <span className="page-loader-label">{label}</span>
    </div>
  );
}
