import { useNavigate, useParams } from 'react-router-dom';
import * as DataService from '../../api/dataService';
import '../pages.css';

export default function RxSuccessPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 480, textAlign: 'center', margin: '60px auto' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>✓</div>
      <div className="page-title" style={{ marginBottom: 8 }}>Prescription Issued</div>
      <div className="page-subtitle" style={{ marginBottom: 24 }}>The prescription has been finalized and saved.</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {id && (
          <a className="primary-btn" href={DataService.getPrescriptionPdfUrl(id)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            View PDF
          </a>
        )}
        <button className="secondary-btn" onClick={() => navigate('/queue')}>Back to queue</button>
      </div>
    </div>
  );
}
