// Shared in-use-machines datalist moved verbatim from WorkOrders (props only).
export function WorkOrdersMachineDatalist({ inUseMachines }) {
  return (
    <>
      <datalist id="wo-inuse-machines">
        {inUseMachines.map((m) => (
          <option
            key={m.code}
            value={m.code}
          >
            {m.code} ({m.location ? `โซน ${m.location}` : ''}{m.standard ? ` · ${m.standard}` : ''}{m.diameter ? ` · ${m.diameter}"` : ''}{m.gauge ? ` ${m.gauge}G` : ''})
          </option>
        ))}
      </datalist>
    </>
  )
}
