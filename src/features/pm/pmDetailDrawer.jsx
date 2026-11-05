import DetailDrawer from '../../components/ui/DetailDrawer'
import StatusBadge from '../../components/ui/StatusBadge'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { format } from 'date-fns'
import { Calendar, ExternalLink, X } from 'lucide-react'
import { formatPMCycle, getPMCountdown, PMCountdownBadge, stripImageUrlMeta } from './pmHelpers.jsx'

export function PMDetailDrawer({ detailRec, setDetailRec, canEdit, canDelete, openEdit, del, setPdfItem, getPMImageUrl, setPreviewImageModal, getPMCylinderType, t }) {
  return (
          <DetailDrawer
            open={!!detailRec}
            onClose={() => setDetailRec(null)}
            title={detailRec?.Machine_MC}
            subtitle={detailRec ? `${detailRec.Machine_KI || ''} · ${detailRec.Type || getPMCylinderType(detailRec) || 'กระบอก'}` : ''}
            icon={Calendar}
            accentColor="#2563eb"
            badge={detailRec && <StatusBadge value={detailRec.Status} />}
            canEdit={canEdit && detailRec?.__hasPMPlan}
            canDelete={canDelete && detailRec?.__hasPMPlan}
            onPdf={() => setPdfItem(detailRec)}
            onEdit={() => openEdit(detailRec)}
            onDelete={() => {
              del(detailRec._id || detailRec.id)
              setDetailRec(null)
            }}
            groups={detailRec ? [
              {
                label: t('dr_main_info'),
                fields: [
                  { label: 'เครื่องปัจจุบัน', value: detailRec.Machine_MC },
                  { label: 'ตำแหน่ง', value: detailRec.Location },
                  { label: 'ซีเรียลเดิม', value: detailRec.Machine_KI, mono: true },
                  { label: 'ประเภท (จากกระบอก)', value: detailRec.Type || getPMCylinderType(detailRec) },
                  { label: 'รอบ PM (วัน)', value: formatPMCycle(detailRec) },
                  { label: t('pm_th_dept'), value: detailRec.Department },
                  { label: t('priority'), value: detailRec.Priority },
                  { label: t('pm_th_tech'), value: detailRec.Assigned_Tech },
                ].filter((f) => f.value),
              },
              {
                label: t('dr_schedule'),
                fields: [
                  { label: t('field_last_pm'), value: detailRec.Last_PM_Date ? format(new Date(detailRec.Last_PM_Date), 'dd/MM/yyyy') : null },
                  { label: t('pm_th_next'), value: detailRec.Next_PM_Date ? format(new Date(detailRec.Next_PM_Date), 'dd/MM/yyyy') : null },
                  {
                    label: 'นับถอยหลัง',
                    value: getPMCountdown(detailRec.Next_PM_Date).label,
                    node: <PMCountdownBadge date={detailRec.Next_PM_Date} />,
                  },
                  { label: 'รูปแบบ', value: detailRec.Frequency_Type },
                  { label: t('field_est_hours'), value: detailRec.Estimated_Hours },
                  { label: 'แผนเวลาหยุดเครื่อง', value: detailRec.Downtime_Plan },
                ].filter((f) => f.value),
              },
              {
                label: t('dr_details'),
                single: true,
                fields: [
                  ...(getPMImageUrl(detailRec) ? [{
                    label: 'รูปภาพประกอบแผน PM',
                    full: true,
                    node: (
                      <div className="flex items-center gap-3 pt-1">
                        <ImageThumbnail
                          url={getPMImageUrl(detailRec)}
                          alt={`แผน PM ${detailRec.Machine_MC || ''}`}
                          size={48}
                          onClick={() => setPreviewImageModal({ url: getPMImageUrl(detailRec), title: `แผน PM เครื่อง ${detailRec.Machine_MC || ''}` })}
                        />
                        <a
                          href={getPMImageUrl(detailRec)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono break-all"
                        >
                          <ExternalLink size={12} className="flex-shrink-0" />
                          <span>เปิดใน Google Drive</span>
                        </a>
                      </div>
                    ),
                  }] : []),
                  { label: t('field_req_parts'), value: detailRec.Required_Parts, full: true },
                  { label: t('remark'), value: stripImageUrlMeta(detailRec.Remark), full: true },
                ].filter((f) => f && (f.node || f.value)),
              },
            ].filter((g) => g.fields.length > 0) : []}
          />
  )
}
