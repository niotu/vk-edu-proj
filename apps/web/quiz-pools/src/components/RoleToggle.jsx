const ROLES = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'ORGANIZER', label: 'Organizer' },
]

export default function RoleToggle({ value, onChange }) {
  const activeIndex = ROLES.findIndex((role) => role.value === value)

  return (
    <div className="qp-roleToggle" role="radiogroup" aria-label="Account role">
      <span
        className="qp-roleToggle__bubble"
        style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
      />
      {ROLES.map((role) => (
        <button
          key={role.value}
          type="button"
          role="radio"
          aria-checked={value === role.value}
          className={'qp-roleToggle__option' + (value === role.value ? ' isActive' : '')}
          onClick={() => onChange(role.value)}
        >
          {role.label}
        </button>
      ))}
    </div>
  )
}
