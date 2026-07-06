import { AppRouter } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/toast/ToastContext';
import { ConfirmProvider } from './components/confirm/ConfirmContext';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <AppRouter />
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
