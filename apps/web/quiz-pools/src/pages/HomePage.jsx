export default function HomePage({ onCreate, onJoin }) {
  return (
    <section className="qp-screen">
      <div className="qp-card">
        <h1 className="qp-title">Quiz Pools</h1>
        <p className="qp-subtitle">
          Create a quiz as organizer or join an existing room as participant.
        </p>

        <div className="qp-actions qp-actions--home">
          <button className="qp-secondaryBtn" type="button" onClick={onCreate}>
            Create
          </button>
          <button className="qp-primaryBtn" type="button" onClick={onJoin}>
            Join
          </button>
        </div>
      </div>
    </section>
  )
}
