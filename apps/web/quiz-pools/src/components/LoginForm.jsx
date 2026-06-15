export default function LoginForm() {
  return (
    <div className="qp-form">
      <label className="qp-field">
        <span className="qp-field__label">Email</span>
        <input className="qp-input" type="email" placeholder="you@example.com" />
      </label>
      <label className="qp-field">
        <span className="qp-field__label">Password</span>
        <input className="qp-input" type="password" placeholder="••••••••" />
      </label>
      <button className="qp-primaryBtn" type="button">
        Continue
      </button>
    </div>
  )
}

