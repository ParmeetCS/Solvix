import { useNavigate } from 'react-router-dom';

export default function AccessDenied() {
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
        <h1>Access Denied</h1>
      </div>

      <div className="alert alert-error">
        You do not have permission to access this page. You are not authorized to view content for this department. Please contact an Administrator if you believe this is an error.
      </div>
    </section>
  );
}