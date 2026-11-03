import { RefreshCw, Disc, Plus } from 'lucide-react'
import { CylinderCard } from './cylinderParts.jsx'

export function CylindersMobileView({
  loading,
  t,
  displayRows,
  canEdit,
  canDelete,
  setDetailRec,
  setPdfItem,
  openQR,
  openEdit,
  del,
  setPreviewImageModal,
  setHistoryTarget,
  setSelectedTagCylinder,
  setActiveTab,
  canAdd,
  openNew,
}) {
  return (
        <div className="space-y-2.5 pb-20">
          {loading && (
            <div className="text-center py-16 text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50 text-blue-500" />
              <span>{t('loading')}</span>
            </div>
          )}
          {!loading && displayRows.map((c, i) => (
            <CylinderCard
              key={c._id || c.id || i}
              c={c}
              canEdit={canEdit}
              canDelete={canDelete}
              onDetail={setDetailRec}
              onPdf={setPdfItem}
              onQr={openQR}
              onEdit={openEdit}
              onDelete={(id) => del(id)}
              onPreviewImage={setPreviewImageModal}
              onHistory={setHistoryTarget}
              onPrintMachineTag={(cyl) => { setSelectedTagCylinder(cyl); setActiveTab('print_machine_tag'); }}
              onPrintTag={(cyl) => { setSelectedTagCylinder(cyl); setActiveTab('print_tag'); }}
            />
          ))}
          {!loading && !displayRows.length && (
            <div className="card p-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
              <Disc size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
              <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ เพิ่ม Cylinder" เพื่อเริ่มต้นบันทึก</p>
            </div>
          )}

          {/* Floating Action Button (FAB) for Mobile */}
          {canAdd && (
            <button
              type="button"
              onClick={openNew}
              className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-500/30"
              title="เพิ่ม Cylinder"
              aria-label="เพิ่ม Cylinder"
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
          )}
        </div>
  )
}
