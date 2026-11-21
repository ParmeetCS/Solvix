import { useNavigate } from 'react-router-dom';

export default function AccountSuspended() {
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
        <h1>Account Suspended</h1>
      </div>

      <div className="alert alert-error">
        Your account has been suspended. Please contact an Administrator for assistance. If you believe this is an error, please reach out to the support team.
      </div>
    </section>
  );
}