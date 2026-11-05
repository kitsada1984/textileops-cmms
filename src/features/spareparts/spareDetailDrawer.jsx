import DetailDrawer from '../../components/ui/DetailDrawer'
import StatusBadge from '../../components/ui/StatusBadge'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { format } from 'date-fns'
import { Package, ShoppingCart } from 'lucide-react'
import { getTotalStockAcrossWarehouses } from '../../utils/inventory'
import { stripSparePartImageMeta } from '../../utils/sparePartImage'

export function SpareDetailDrawer({ detailRec, setDetailRec, canEdit, canDelete, openEdit, del, setPdfItem, getSparePartImageUrl, setPreviewImageModal, getSparePartName, getSparePartStatus, handle1ClickPR, data, t }) {
  return (
      <DetailDrawer
        open={!!detailRec}
        onClose={() => setDetailRec(null)}
        title={getSparePartName(detailRec) || detailRec?.Part_Code}
        subtitle={detailRec ? `${detailRec.Part_Code} · ${detailRec.Category || 'อะไหล่'}` : ''}
        icon={Package}
        accentColor="#2563eb"
        badge={detailRec && <StatusBadge value={getSparePartStatus(detailRec)} />}
        canEdit={canEdit}
        canDelete={canDelete}
        onPdf={() => setPdfItem(detailRec)}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => {
          del(detailRec._id || detailRec.id)
          setDetailRec(null)
        }}
        extraActions={
          detailRec ? (
            <button
              type="button"
              onClick={() => {
                const rec = detailRec
                setDetailRec(null)
                handle1ClickPR(rec)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 11,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              <ShoppingCart size={14} /> 🛒 เปิดใบขอซื้อ (1-Click PR)
            </button>
          ) : null
        }
        groups={detailRec ? [
          {
            label: t('dr_general_info'),
            fields: [
              { label: t('sp_th_code'), value: detailRec.Part_Code, mono: true },
              { label: t('sp_th_name_en'), value: detailRec.Part_Name_EN },
              { label: t('sp_th_cat'), value: detailRec.Category },
              { label: t('field_unit'), value: detailRec.Unit },
              { label: t('field_warehouse'), value: detailRec.Location_Store },
              { label: t('field_supplier'), value: detailRec.Supplier },
              ...(getSparePartImageUrl(detailRec) ? [{
                label: 'รูปถ่ายอะไหล่',
                full: true,
                node: (
                  <div className="pt-1">
                    <ImageThumbnail
                      url={getSparePartImageUrl(detailRec)}
                      alt={`${detailRec.Part_Code} - ${getSparePartName(detailRec)}`}
                      size={48}
                      onClick={() => setPreviewImageModal({ url: getSparePartImageUrl(detailRec), title: `${detailRec.Part_Code} - ${getSparePartName(detailRec)}` })}
                    />
                  </div>
                ),
              }] : []),
            ].filter((f) => f && (f.node || f.value)),
          },
          {
            label: 'สต๊อกและราคา',
            fields: [
              { label: t('sp_th_stock'), value: detailRec.Stock_Qty != null ? `${detailRec.Stock_Qty} ${detailRec.Unit || ''}` : null },
              { label: t('sp_th_min'), value: detailRec.Min_Qty != null ? `${detailRec.Min_Qty} ${detailRec.Unit || ''}` : null },
              { label: t('sp_th_price'), value: detailRec.Unit_Price != null ? `฿${Number(detailRec.Unit_Price).toLocaleString()}` : null },
              { label: 'เครื่องที่ใช้ได้', value: Array.isArray(detailRec.Compatible_Machines) ? detailRec.Compatible_Machines.join(', ') : detailRec.Compatible_Machines },
            ].filter((f) => f.value),
          },
          ...(detailRec && getTotalStockAcrossWarehouses(data, detailRec.Part_Code).warehouseCount > 1 ? [{
            label: `📦 สถานะสต๊อกทุกคลังสำหรับรหัสนี้ (รวม ${getTotalStockAcrossWarehouses(data, detailRec.Part_Code).totalStock.toLocaleString()} ${detailRec.Unit || 'ชิ้น'})`,
            fields: [
              ...getTotalStockAcrossWarehouses(data, detailRec.Part_Code).locations.map((loc) => ({
                label: `คลัง ${loc.location}`,
                mono: true,
                value: `${loc.stock.toLocaleString()} ${loc.unit || detailRec.Unit || 'ชิ้น'}${loc.id === (detailRec.id || detailRec._id) ? ' (รายการนี้)' : ''}`,
              })),
              {
                label: 'ยอดรวมสต๊อกทุกคลัง',
                mono: true,
                value: `${getTotalStockAcrossWarehouses(data, detailRec.Part_Code).totalStock.toLocaleString()} ${detailRec.Unit || 'ชิ้น'}`,
              },
            ],
          }] : []),
          {
            label: t('remark'),
            single: true,
            fields: [
              { label: t('remark'), value: stripSparePartImageMeta(detailRec.Remark), full: true },
            ].filter((f) => f.value),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />
  )
}
