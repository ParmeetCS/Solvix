import { useNavigate } from 'react-router-dom';

export default function RegisterEmployee() {
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
        <h1>Employee Registration</h1>
        <p>Request a new SOLVIX employee account (by invitation only).</p>
      </div>
      <div className="auth-form placeholder">
        <p>Employee registration form coming soon.</p>
      </div>
    </section>
  );
}
