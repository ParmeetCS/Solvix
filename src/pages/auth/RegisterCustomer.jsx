import { useNavigate } from 'react-router-dom';

export default function RegisterCustomer() {
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
        <h1>Customer Registration</h1>
        <p>Create a new SOLVIX customer account.</p>
      </div>
      <div className="auth-form placeholder">
        <p>Customer registration form coming soon.</p>
      </div>
    </section>
  );
}
