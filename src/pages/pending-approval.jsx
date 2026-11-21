import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <section className="page">
      <div className="page-head">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
          className="back-link"
        >
          &larr; Back to home
        </a>
        <h1>Pending Approval</h1>
      </div>

      <div className="alert alert-info">
        Your employee access request is pending review by an Administrator. Once approved, you will receive access to your assigned department. You will be notified via email when your request is processed.
      </div>
    </section>
  );
}