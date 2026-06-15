export default function JoinPage() {
  return (
    <section className="qp-screen">
      <div className="qp-card qp-card--wide">
        <h1 className="qp-title">Join a pool</h1>

        <div className="qp-form">
          <label className="qp-field">
            <span className="qp-field__label">Invite code</span>
            <input className="qp-input" type="text" placeholder="ABCD-1234" />
          </label>
          <button className="qp-primaryBtn" type="button">
            Join
          </button>
        </div>
      </div>
    </section>
  )
}
