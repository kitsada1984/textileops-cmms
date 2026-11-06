import WorkOrdersReportModal from '../../components/workorder/WorkOrdersReportModal'

// Filtered print-report modal moved verbatim from WorkOrders (props only).
export function WorkOrdersReportBridge({ reportModalOpen, setReportModalOpen, filteredJobs, typeFilters, statusFilters, search, showDeleted, kpiTargets, user }) {
  return (
    <>
      {reportModalOpen && (
        <WorkOrdersReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          items={filteredJobs}
          filterContext={{
            typeFilters,
            statusFilters,
            search,
            showDeleted,
          }}
          kpiTargets={kpiTargets}
          currentUserName={user?.full_name || user?.line_display_name || user?.username || user?.Name || 'ช่างผู้ใช้งาน'}
        />
      )}
    </>
  )
}
