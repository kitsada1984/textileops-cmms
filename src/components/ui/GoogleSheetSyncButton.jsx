import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { useToast } from './Toast'
import { syncRowsToGoogleSheet } from '../../utils/googleSheetsSync'

export default function GoogleSheetSyncButton({
  sheetName,
  columns,
  rows,
  valueGetters,
  totalCount,
  className = 'btn-outline',
}) {
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)

  const onClick = async () => {
    // The sheet is fully replaced by the rows we send — warn before pushing a
    // filtered/searched subset over the complete data set.
    if (Number.isFinite(totalCount) && rows.length < totalCount) {
      const ok = window.confirm(
        `กำลังอัปเดตชีท "${sheetName}" ด้วยข้อมูลที่แสดงอยู่ ${rows.length} จาก ${totalCount} รายการ\n` +
        '(มีคำค้นหรือตัวกรองทำงานอยู่ — ชีทจะถูกเขียนทับด้วยเฉพาะรายการที่แสดง)\n\nต้องการดำเนินการต่อหรือไม่?'
      )
      if (!ok) return
    }
    setSyncing(true)
    try {
      const result = await syncRowsToGoogleSheet({ sheetName, columns, rows, valueGetters })
      toast.success('อัปเดต Google Sheet สำเร็จ', `${result.sheetName || sheetName}: ${result.rowCount ?? rows.length} รายการ`)
    } catch (error) {
      toast.error('อัปเดต Google Sheet ไม่สำเร็จ', error.message)
    }
    setSyncing(false)
  }

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={syncing}
      title="อัปเดต Google Sheet"
    >
      <FileSpreadsheet size={14} />
      {syncing ? 'กำลังอัปเดต...' : 'อัปเดต Sheet'}
    </button>
  )
}
