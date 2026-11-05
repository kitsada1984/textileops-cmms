import DetailDrawer from '../../components/ui/DetailDrawer'
import StatusBadge from '../../components/ui/StatusBadge'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { format } from 'date-fns'
import { Sparkles } from 'lucide-react'
import { computeCounterDiff } from '../../utils/counterDiff'
import { normalizeCylinderType } from '../../utils/needleConditionSync'

export function NeedleDetailDrawer({ detailItem, setDetailItem, canEdit, canDelete, handleEdit, handleDelete, setPdfItem, setPreviewImageModal, renderStatusBadge, t }) {
  return (
    <>
      {detailItem && (
        <DetailDrawer
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          title={`สภาพเข็ม: ${detailItem.serial || detailItem.machine_mc || '—'}`}
          subtitle={`เครื่อง: ${detailItem.machine_mc || '—'} · ตำแหน่ง: ${detailItem.location || '—'}`}
          icon={Sparkles}
          accentColor="#2563eb"
          badge={renderStatusBadge(detailItem.status)}
          canEdit={canEdit}
          canDelete={canDelete}
          onPdf={() => setPdfItem(detailItem)}
          onEdit={() => {
            handleEdit(detailItem)
            setDetailItem(null)
          }}
          onDelete={() => {
            handleDelete(detailItem.id, detailItem.serial)
            setDetailItem(null)
          }}
          groups={[
            {
              label: 'ข้อมูลกระบอก & สภาพเข็มล่าสุด',
              fields: [
                { label: 'ซีเรียล (Serial)', value: detailItem.serial, mono: true },
                { label: 'เครื่องจักร (MC)', value: detailItem.machine_mc },
                { label: 'ตำแหน่ง (Location)', value: detailItem.location },
                { label: 'ประเภท (Type)', value: normalizeCylinderType(detailItem.type) },
                { label: 'Counter ล่าสุด', value: detailItem.counter ? `${Number(detailItem.counter).toLocaleString()} รอบ` : '—', mono: true },
                { label: 'Counter ครั้งก่อน', value: (detailItem.counter_prev ?? detailItem.counter_total) ? `${Number(detailItem.counter_prev ?? 0).toLocaleString()} รอบ` : '—', mono: true },
                { label: 'ผลต่างรอบ', value: computeCounterDiff(detailItem.counter, detailItem.counter_prev ?? detailItem.counter_total) > 0 ? `+${computeCounterDiff(detailItem.counter, detailItem.counter_prev ?? detailItem.counter_total).toLocaleString()} รอบ` : '—', mono: true },
                { label: 'วันที่ตรวจล่าสุด', value: detailItem.doc_date ? format(new Date(detailItem.doc_date), 'dd/MM/yyyy') : '—', mono: true },
                { label: 'ช่างผู้ตรวจ', value: detailItem.inspector },
                { label: 'สถานะสภาพเข็ม', value: detailItem.status },
                ...((Array.isArray(detailItem.images) && detailItem.images.length > 0) ? [{
                  label: `รูปถ่ายสภาพเข็ม (${detailItem.images.length} รูป)`,
                  full: true,
                  node: (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {detailItem.images.map((img, idx) => (
                        <ImageThumbnail
                          key={idx}
                          url={img}
                          alt={`สภาพเข็ม ${detailItem.serial}`}
                          size={48}
                          onClick={() =>
                            setPreviewImageModal({
                              url: img,
                              title: `สภาพเข็ม: ${detailItem.serial}`,
                            })
                          }
                        />
                      ))}
                    </div>
                  ),
                }] : []),
              ].filter((f) => f && (f.node || f.value)),
            },
            {
              label: 'รายละเอียดและข้อสังเกต',
              single: true,
              fields: [
                { label: 'สภาพเข็ม / ข้อสังเกต', value: detailItem.needle_condition || '—', full: true },
                { label: 'หมายเหตุเพิ่มเติม', value: detailItem.remark || '—', full: true },
              ],
            },
          ]}
        />
      )}
    </>
  )
}
