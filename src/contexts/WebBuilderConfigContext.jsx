import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AppConfigAPI } from '../api/entities'

const CONFIG_KEY = 'web_builder_config'

const MENU_LABEL_BY_ROUTE = {
  '/machines': 'เครื่องจักร',
  '/cylinders': 'กระบอก',
  '/workorders': 'ใบสั่งงาน',
  '/pm': 'แผน PM',
  '/design-bom': 'Design/BOM',
  '/spareparts': 'อะไหล่',
  '/purchasing': 'จัดซื้อ',
  '/stock': 'เคลื่อนไหวสต็อก',
  '/repair-requests': 'แจ้งซ่อม',
}

const COLUMN_LABEL_BY_ROUTE = {
  '/machines': {
    Serial_OLD: 'ซีเรียลเดิม',
    Serial_NEW: 'ซีเรียลใหม่',
    Feeder: 'ฟีดเดอร์',
    Diameter: 'เส้นผ่านศูนย์กลาง',
    Gauge: 'เกจ',
    Needle: 'เข็ม',
    Sinker: 'ซิงเกอร์',
    Tape1_No: 'เทป 1',
    Tape2_No: 'เทป 2',
    Tape3_No: 'เทป 3',
    Tape4_No: 'เทป 4',
  },
  '/cylinders': {
    Standard: 'มาตรฐาน',
    Serial_OLD: 'ซีเรียลเดิม',
    Serial_NOW: 'ซีเรียลปัจจุบัน',
    Feeder: 'ฟีดเดอร์',
    Diameter: 'เส้นผ่านศูนย์กลาง',
    Gauge: 'เกจ',
    Needle: 'เข็ม',
    ImageUrl: 'URL',
    ImagePreview: 'รูป',
  },
  '/workorders': {
    Design: 'Design',
  },
  '/pm': {
    Machine_MC: 'เครื่องปัจจุบัน',
    Machine_KI: 'ซีเรียลเดิม',
    Downtime_Plan: 'เวลาหยุดเครื่อง (นาที)',
  },
  '/design-bom': {
    Design: 'แบบงาน',
    ImagePreview: 'รูป',
    Comment: 'หมายเหตุ',
    LastUpdated: 'อัปเดตล่าสุด',
  },
  '/spareparts': {
    Part_Code: 'รหัสอะไหล่',
    Part_Name_EN: 'ชื่ออะไหล่',
    Stock_Qty: 'คงเหลือ',
    Min_Qty: 'ขั้นต่ำ',
    Supplier: 'ผู้จัดจำหน่าย',
    Compatible_Machines: 'เครื่องที่ใช้ได้',
    ImagePreview: 'รูป',
  },
  '/purchasing': {
    PO_Number: 'เลข PO',
    Order_Date: 'วันที่สั่ง',
    Received_Date: 'วันที่รับ',
    Status: 'สถานะ',
    Part_Code: 'รหัสอะไหล่',
    Part_Name_EN: 'ชื่ออะไหล่',
    Category: 'หมวดหมู่',
    Detail: 'รายละเอียด',
    Qty: 'จำนวน',
    UnitPrice: 'ราคาต่อหน่วย',
    Total_Amount: 'ราคารวม',
    Supplier: 'แหล่งที่มา',
    Phone: 'โทรศัพท์',
    Email: 'อีเมล',
    Line: 'ไลน์',
    ImagePreview: 'รูป',
    Note: 'หมายเหตุ',
    LastUpdated: 'อัปเดตล่าสุด',
  },
  '/stock': {
    TXN_ID: 'เลขรายการ',
    TXN_Type: 'ประเภท',
    Part_Code: 'รหัสอะไหล่',
    Part_Name_EN: 'ชื่ออะไหล่',
    Category: 'หมวดหมู่',
    Unit_Price: 'ราคาต่อหน่วย',
    ImagePreview: 'รูป',
    Note: 'หมายเหตุ',
  },
  '/repair-requests': {
    cylinder_serial: 'ซีเรียล',
    machine_mc: 'เครื่องปัจจุบัน',
    Design: 'แบบงาน',
    cylinder_standard: 'มาตรฐาน',
  },
}

const CATEGORY_OPTIONS = [
  { id: 'category_spare_part', label: 'อะไหล่', value: 'อะไหล่' },
  { id: 'category_tool', label: 'เครื่องมือช่าง', value: 'เครื่องมือช่าง' },
]

function normalizeMenus(menus = []) {
  return menus.map(menu => {
    const labelByField = COLUMN_LABEL_BY_ROUTE[menu.route] || {}
    const columns = (menu.columns || [])
      .filter(col => !(menu.route === '/spareparts' && col.field === 'Part_Name_TH'))
      .filter(col => !(menu.route === '/stock' && col.field === 'Reference_Type'))
      .filter(col => !(menu.route === '/pm' && col.field === 'Frequency_Value'))
      .map(col => {
      const normalizedLabel = labelByField[col.field] || col.label
      if (col.field === 'PM_Type') {
        return {
          ...col,
          label: 'รอบ PM (วัน)',
          type: 'select',
          options: [
            { id: 'pm_30', label: '30 วัน', value: '30' },
            { id: 'pm_60', label: '60 วัน', value: '60' },
            { id: 'pm_90', label: '90 วัน', value: '90' },
            { id: 'pm_custom', label: 'ระบุเอง', value: 'CUSTOM' },
          ],
        }
      }
      if (col.field === 'Frequency_Value') return { ...col, label: 'จำนวนวัน', type: 'number' }
      if (col.field === 'Last_PM_Date') return { ...col, label: 'PM ล่าสุด', type: 'date' }
      if (col.field === 'Next_PM_Date') return { ...col, label: 'PM ครั้งถัดไป', type: 'date' }
      if (['/spareparts', '/purchasing', '/stock'].includes(menu.route) && col.field === 'Category') {
        return { ...col, label: 'หมวดหมู่', type: 'select', options: CATEGORY_OPTIONS }
      }
      return { ...col, label: normalizedLabel }
    })
    return { ...menu, label: MENU_LABEL_BY_ROUTE[menu.route] || menu.label, columns }
  })
}

const Ctx = createContext({
  menus: [], setMenus: () => {},
  configRecordId: null, setConfigRecordId: () => {},
  reload: async () => {},
})

export function WebBuilderConfigProvider({ children }) {
  const [menus,          setMenus]          = useState([])
  const [configRecordId, setConfigRecordId] = useState(null)

  const reload = useCallback(async () => {
    try {
      const rows = await AppConfigAPI.list()
      const row  = rows.find(r => r.key === CONFIG_KEY)
      if (row) {
        setConfigRecordId(row.id)
        const parsed = normalizeMenus(JSON.parse(row.value || '[]'))
        if (parsed.length) setMenus(parsed)
      }
    } catch {}
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <Ctx.Provider value={{ menus, setMenus, configRecordId, setConfigRecordId, reload }}>
      {children}
    </Ctx.Provider>
  )
}

export const useWebBuilderConfig = () => useContext(Ctx)
