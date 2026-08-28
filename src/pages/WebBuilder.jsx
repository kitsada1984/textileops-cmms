import { useState, useCallback } from 'react'
import usePagePerms from '../hooks/usePagePerms'
import { useWebBuilderConfig } from '../contexts/WebBuilderConfigContext'
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Save,
  RefreshCw, X, Check, Columns, ListOrdered,
  LayoutDashboard, Cpu, Disc, ClipboardList, Calendar,
  Package, ShoppingCart, BarChart3, Settings, ScrollText,
  ArrowLeftRight, Users, Layers, Factory, FileText,
  Database, Globe, Star, Tag, Home, Bell, List,
} from 'lucide-react'
import { AppConfigAPI } from '../api/entities'
import { uid, col, sel, moveItem, validateMenu, validateCol } from '../utils/webBuilderUtils'
import { useToast } from '../components/ui/Toast'
import { OPTION_COLORS } from '../components/ui/StatusBadge'

// ─── Constants ──────────────────────────────────────────────
const CONFIG_KEY = 'web_builder_config'

const ICONS = [
  'LayoutDashboard','Cpu','Disc','ClipboardList','Calendar','Package',
  'ShoppingCart','BarChart3','Settings','ScrollText','ArrowLeftRight',
  'Users','Layers','Factory','FileText','Database','Globe','Star',
  'Tag','Home','Bell','List',
]
const ICON_MAP = {
  LayoutDashboard, Cpu, Disc, ClipboardList, Calendar, Package,
  ShoppingCart, BarChart3, Settings, ScrollText, ArrowLeftRight,
  Users, Layers, Factory, FileText, Database, Globe, Star,
  Tag, Home, Bell, List,
}

const COL_TYPES = [
  { value:'text',           label:'ข้อความ (Text)' },
  { value:'number',         label:'ตัวเลข (Number)' },
  { value:'date',           label:'วันที่ (Date)' },
  { value:'datetime-local', label:'วันที่+เวลา' },
  { value:'select',         label:'ดรอปดาวน์ (Select)' },
  { value:'textarea',       label:'ข้อความยาว (Textarea)' },
  { value:'email',          label:'อีเมล' },
  { value:'boolean',        label:'ใช่/ไม่ใช่ (Boolean)' },
]

const WIDTHS  = ['60px','80px','100px','120px','150px','200px','250px','300px','400px','auto','full']
const HEIGHTS = ['1','2','3','4','5','6']

const EMPTY_MENU = { id:'', label:'', icon:'LayoutDashboard', route:'', order:0, columns:[] }
const EMPTY_COL  = { id:'', field:'', label:'', type:'text', width:'150px', height:'1', required:false, order:0, options:[] }
const CATEGORY_OPTIONS = ['อะไหล่', 'เครื่องมือช่าง']

// ─── Default app menus with real DB columns ──────────────────

const DEFAULT_APP_MENUS = [
  {
    id: uid(), label:'เครื่องจักร', icon:'Cpu', route:'/machines', order:0,
    columns:[
      col('ITEM','ลำดับ','number','70px'), col('Location','ตำแหน่ง','text','120px'),
      col('Mc','รหัสเครื่อง','text','120px',{required:true}),
      col('WaterCheck','ตรวจน้ำ','text','100px'),
      col('Serial_OLD','ซีเรียลเดิม','text','130px'), col('Serial_NEW','ซีเรียลใหม่','text','130px'),
      col('Feeder','ฟีดเดอร์','text','100px'), col('Manufacturer','ยี่ห้อ','text','130px'),
      col('Type','ประเภท','text','100px'), col('Diameter','เส้นผ่านศูนย์กลาง','text','100px'),
      col('Gauge','เกจ','text','80px'), col('Needle','เข็ม','number','80px'),
      col('Oil','น้ำมัน','text','100px'), col('Model','รุ่น','text','120px'),
      col('Model_Inverter','รุ่นอินเวอร์เตอร์','text','130px'), col('Sinker','ซิงเกอร์','text','100px'),
      col('Tape1_No','เทป 1','text','100px'), col('Tape2_No','เทป 2','text','100px'),
      col('Tape3_No','เทป 3','text','100px'), col('Tape4_No','เทป 4','text','100px'),
      col('Tape5_No','เทป 5','text','100px'),
      col('Dial_Front','ไดอัลหน้า','text','110px'), col('Dial_Rear','ไดอัลหลัง','text','110px'),
      col('Leg1','ขา 1','text','90px'), col('Leg2','ขา 2','text','90px'),
      col('Leg3','ขา 3','text','90px'), col('Leg4','ขา 4','text','90px'),
      col('ImageUrl','URL','text','220px'),
      col('ImagePreview','รูป','text','110px'),
      sel('Status','สถานะ',['RUNNING','BREAKDOWN','MAINTENANCE','IDLE','DECOMMISSIONED'],'150px'),
      col('Remark','หมายเหตุ','textarea','200px',{height:'2'}),
    ],
  },
  {
    id: uid(), label:'กระบอก', icon:'Disc', route:'/cylinders', order:1,
    columns:[
      col('ITEM','ลำดับ','number','70px'), col('Location','ตำแหน่ง','text','120px'),
      col('Standard','มาตรฐาน','text','120px'), col('NewMC','เครื่องปัจจุบัน','text','130px'),
      col('Serial_OLD','ซีเรียลเดิม','text','130px'), col('Serial_NOW','ซีเรียลปัจจุบัน','text','130px',{required:true}),
      sel('Status_Now','สถานะ',['STANDARD','SWAPPED','SPARE','REPAIR','RESERVE','SCRAP'],'130px'),
      col('Feeder','ฟีดเดอร์','text','100px'), col('Manufacturer','ยี่ห้อ','text','130px'),
      col('Type','ประเภท','text','100px'), col('Diameter','เส้นผ่านศูนย์กลาง','text','100px'),
      col('Gauge','เกจ','text','80px'), col('Needle','เข็ม','number','80px'),
      sel('Machine_Ref','อ้างอิงกระบอก',['In-use-GMK1','Spare-GMK1','In-use-GMK3','Spare-GMK3'],'130px'),
      col('ImageUrl','URL','text','220px'),
      col('ImagePreview','รูป','text','110px'),
      col('Comment','หมายเหตุ','textarea','200px',{height:'2'}),
    ],
  },
  {
    id: uid(), label:'ใบสั่งงาน', icon:'ClipboardList', route:'/workorders', order:2,
    columns:[
      col('KI','KI','text','120px',{required:true}), col('MC','MC','text','120px',{required:true}),
      col('Design','Design','text','120px'), col('BOM','BOM','text','120px'),
      col('DateStart','วันที่เริ่ม','date','130px'), col('DateEnd','วันที่เสร็จ','date','130px'),
      sel('JobType','ประเภทงาน',['KNITTING','DYEING','FINISHING','REPAIR','MAINTENANCE','SETUP','INSPECTION','OTHER'],'170px'),
      sel('Status','สถานะ',['OPEN','IN_PROGRESS','COMPLETED','CLOSED','CANCELLED'],'140px'),
      col('Tech','ช่าง','text','130px'), col('Duration','ระยะเวลา (นาที)','number','130px'),
      col('Problem','รายละเอียด','textarea','200px',{height:'2'}),
      col('Result_Raw','ผลดิบ','text','120px'), col('Result_Set','ผลเซ็ต','text','120px'),
      col('Result_Dye','ผลย้อม','text','120px'), col('Result_Fix','ผลฟิกซ์','text','120px'),
      col('Comment','หมายเหตุ','textarea','200px',{height:'2'}),
      col('LastUpdated','อัปเดตล่าสุด','date','130px'),
    ],
  },
  {
    id: uid(), label:'แผน PM', icon:'Calendar', route:'/pm', order:3,
    columns:[
      col('Machine_MC','เครื่องปัจจุบัน','text','150px',{required:true}), col('Machine_KI','ซีเรียลเดิม','text','130px'),
      col('PM_Type','รอบ PM (วัน)','select','130px',{
        options:[
          { id: uid(), label:'30 วัน', value:'30' },
          { id: uid(), label:'60 วัน', value:'60' },
          { id: uid(), label:'90 วัน', value:'90' },
          { id: uid(), label:'ระบุเอง', value:'CUSTOM' },
        ],
      }),
      col('Department','แผนก','text','120px'),
      sel('Frequency_Type','รูปแบบ',['CALENDAR','RUNTIME'],'120px'),
      col('Last_PM_Date','PM ล่าสุด','date','130px'), col('Next_PM_Date','PM ครั้งถัดไป','date','140px',{required:true}),
      col('Estimated_Hours','ชั่วโมง (ประเมิน)','number','130px'), col('Assigned_Tech','ช่าง','text','130px'),
      sel('Priority','ความสำคัญ',['HIGH','MEDIUM','LOW'],'110px'),
      sel('Status','สถานะ',['SCHEDULED','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED'],'140px'),
      col('Required_Parts','อะไหล่ที่ต้องใช้','textarea','200px',{height:'2'}),
      col('Downtime_Plan','เวลาหยุดเครื่อง (นาที)','number','130px'),
      col('ImageUrl','URL','text','220px'),
      col('ImagePreview','รูป','text','110px'),
      col('Remark','หมายเหตุ','textarea','200px',{height:'2'}), col('CreatedBy','สร้างโดย','text','120px'),
    ],
  },
  {
    id: uid(), label:'Design/BOM', icon:'FileText', route:'/design-bom', order:4,
    columns:[
      col('MC','MC','text','120px'),
      col('Design','แบบงาน','text','130px'),
      col('KI','KI','text','130px'),
      col('BOM','BOM','text','130px'),
      col('CL1','CL1','text','90px'),
      col('CL2','CL2','text','90px'),
      col('CL3','CL3','text','90px'),
      col('CL4','CL4','text','90px'),
      col('SP','SP','text','90px'),
      col('SL1','SL1','text','90px'),
      col('SL2','SL2','text','90px'),
      col('SL3','SL3','text','90px'),
      col('SL4','SL4','text','90px'),
      col('ImageUrl','URL','text','220px'),
      col('ImagePreview','รูป','text','110px'),
      col('Comment','หมายเหตุ','textarea','220px',{height:'2'}),
      col('LastUpdated','อัปเดตล่าสุด','date','130px'),
    ],
  },
  {
    id: uid(), label:'อะไหล่', icon:'Package', route:'/spareparts', order:5,
    columns:[
      col('Part_Code','รหัสอะไหล่','text','130px',{required:true}),
      col('Part_Name_EN','ชื่ออะไหล่','text','180px',{required:true}),
      sel('Category','หมวดหมู่',CATEGORY_OPTIONS,'130px'), col('Unit','หน่วย','text','80px'),
      col('Stock_Qty','คงเหลือ','number','90px'), col('Min_Qty','ขั้นต่ำ','number','90px'),
      col('Location_Store','ที่เก็บ','text','130px'), col('Supplier','ผู้จัดจำหน่าย','text','150px'),
      col('Unit_Price','ราคา/หน่วย','number','110px'),
      sel('Status','สถานะ',['IN_STOCK','LOW_STOCK','OUT_OF_STOCK'],'130px'),
      col('Compatible_Machines','เครื่องที่ใช้ได้','text','180px'),
      col('ImageUrl','URL','text','220px'),
      col('ImagePreview','รูป','text','110px'),
      col('Remark','หมายเหตุ','textarea','200px',{height:'2'}),
    ],
  },
  {
    id: uid(), label:'จัดซื้อ', icon:'ShoppingCart', route:'/purchasing', order:6,
    columns:[
      col('PO_Number','เลข PO','text','130px'),
      col('Order_Date','วันที่สั่ง','date','130px'),
      col('Received_Date','วันที่รับ','date','130px'),
      sel('Status','สถานะ',['ORDERED','RECEIVED','CANCELLED'],'140px'),
      col('Part_Code','รหัสอะไหล่','text','130px'),
      col('Part_Name_EN','ชื่ออะไหล่','text','180px'),
      sel('Category','หมวดหมู่',CATEGORY_OPTIONS,'140px'),
      col('Detail','รายละเอียด','text','220px'),
      col('Qty','จำนวน','number','90px'),
      col('UnitPrice','ราคาต่อหน่วย','number','110px'),
      col('Total_Amount','ราคารวม','number','120px'),
      col('Supplier','แหล่งที่มา','text','160px',{required:true}),
      col('Phone','โทรศัพท์','text','120px'),
      col('Email','อีเมล','email','170px'),
      col('Line','ไลน์','text','120px'),
      col('ImageUrl','URL','text','220px'),
      col('ImagePreview','รูป','text','110px'),
      col('Note','หมายเหตุ','textarea','220px',{height:'2'}),
      col('LastUpdated','อัปเดตล่าสุด','date','130px'),
    ],
  },
  {
    id: uid(), label:'เคลื่อนไหวสต็อก', icon:'ArrowLeftRight', route:'/stock', order:7,
    columns:[
      sel('TXN_Type','ประเภท',['RECEIVE','ISSUE','ADJUST','RETURN','SCRAP'],'130px',{required:true}),
      col('Part_Code','รหัสอะไหล่','text','130px',{required:true}),
      col('Part_Name_EN','ชื่ออะไหล่','text','180px'),
      sel('Category','หมวดหมู่',CATEGORY_OPTIONS,'140px'),
      col('Qty_Before','ก่อน','number','80px'), col('Qty_Change','เปลี่ยนแปลง','number','110px',{required:true}),
      col('Qty_After','หลัง','number','80px'), col('Unit','หน่วย','text','80px'),
      col('Unit_Price','ราคา/หน่วย','number','110px'),
      col('Reference','อ้างอิง','text','130px'), col('Location_Store','ที่เก็บ','text','130px'),
      col('Performed_By','ผู้ดำเนินการ','text','130px'),
      col('ImageUrl','URL','text','220px'),
      col('ImagePreview','รูป','text','110px'),
      col('Note','หมายเหตุ','textarea','220px',{height:'2'}),
    ],
  },
  {
    id: uid(), label:'แจ้งซ่อม', icon:'Layers', route:'/repair-requests', order:8,
    columns:[
      col('request_no','เลขที่','text','130px'), col('cylinder_serial','ซีเรียล','text','130px',{required:true}),
      col('machine_mc','เครื่องปัจจุบัน','text','130px'),
      col('KI','KI','text','110px'),
      col('Design','แบบงาน','text','120px'),
      col('cylinder_location','ตำแหน่ง','text','120px'), col('cylinder_standard','มาตรฐาน','text','120px'),
      col('problem_description','ปัญหา','textarea','200px',{height:'3',required:true}),
      col('reported_by','ผู้แจ้ง','text','120px',{required:true}),
      sel('status','สถานะ',['PENDING','APPROVED','REJECTED','IN_PROGRESS','COMPLETED'],'140px'),
      col('technician_name','ช่าง','text','120px'), col('approval_notes','หมายเหตุ Supervisor','textarea','200px',{height:'2'}),
      col('repair_details','รายละเอียดการซ่อม','textarea','200px',{height:'3'}),
      col('parts_used','อะไหล่ที่ใช้','text','150px'), col('completed_by','ช่างที่ซ่อม','text','120px'),
    ],
  },
]

// ─── Color picker (for dropdown options) ─────────────────────
function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
      <button
        title="ไม่มีสี (ใช้สีอัตโนมัติ)"
        onClick={() => onChange('')}
        style={{
          width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
          background: 'var(--bg-page)', border: value === '' ? '2px solid var(--text-700)' : '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-400)', fontSize: 14, lineHeight: 1,
        }}
      >×</button>
      {OPTION_COLORS.map(c => (
        <button key={c.id} title={c.id} onClick={() => onChange(c.id)} style={{
          width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
          background: c.hex, border: 'none',
          outline: value === c.id ? `3px solid ${c.hex}` : '2px solid transparent',
          outlineOffset: value === c.id ? 2 : 0,
          transition: 'outline 120ms',
        }}/>
      ))}
    </div>
  )
}

// ─── Icon renderer ───────────────────────────────────────────
function Icon({ name, size=15, className='', style }) {
  const C = ICON_MAP[name]
  return C ? <C size={size} className={className} style={style}/> : null
}

// ─── Small reusable Modal ────────────────────────────────────
function Modal({ open, onClose, title, children, footer, size='md' }) {
  if (!open) return null
  const w = { sm:'max-w-sm', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-3xl' }[size]
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className={`modal-box ${w}`}>
        <div className="modal-header">
          <span className="font-semibold" style={{color:'var(--text-900)'}}>{title}</span>
          <button onClick={onClose}><X size={18} style={{color:'var(--text-400)'}}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// ─── Options editor (for select-type columns) ────────────────
function OptionsEditor({ options, onChange }) {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [color, setColor] = useState('')

  const add = () => {
    if (!label.trim()) return
    onChange([...options, { id: uid(), label: label.trim(), value: value.trim() || label.trim(), color }])
    setLabel(''); setValue(''); setColor('')
  }

  const remove = (id) => onChange(options.filter(o => o.id !== id))

  const update = (id, field, val) => onChange(options.map(o => o.id === id ? { ...o, [field]: val } : o))

  const move = (idx, dir) => {
    const arr = [...options]
    const to = idx + dir
    if (to < 0 || to >= arr.length) return
    ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
    onChange(arr)
  }

  return (
    <div className="space-y-2">
      <label className="label">ตัวเลือก (Options)</label>
      <div className="border rounded-lg overflow-hidden" style={{borderColor:'var(--border)'}}>
        {options.length === 0 && (
          <div className="px-3 py-2 text-xs" style={{color:'var(--text-400)'}}>ยังไม่มีตัวเลือก</div>
        )}
        {options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2 px-2 py-1.5" style={{borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-card)'}}>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i,-1)} disabled={i===0} className="disabled:opacity-20" style={{color:'var(--text-400)'}}><ChevronUp size={12}/></button>
              <button onClick={() => move(i,1)} disabled={i===options.length-1} className="disabled:opacity-20" style={{color:'var(--text-400)'}}><ChevronDown size={12}/></button>
            </div>
            <input className="input text-xs flex-1 py-1 px-2" placeholder="Label" value={o.label}
              onChange={e => update(o.id,'label',e.target.value)} />
            <input className="input text-xs w-28 py-1 px-2" placeholder="Value"
              value={o.value} onChange={e => update(o.id,'value',e.target.value)} />
            <ColorPicker value={o.color || ''} onChange={val => update(o.id,'color',val)} />
            <button onClick={() => remove(o.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={13}/></button>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input className="input text-xs flex-1" placeholder="Label" value={label} onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key==='Enter' && add()} />
          <input className="input text-xs w-28" placeholder="Value (optional)" value={value} onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key==='Enter' && add()} />
          <button className="btn-primary text-xs py-1 px-3" onClick={add}><Plus size={13}/></button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
      </div>
    </div>
  )
}

// ─── Inline Width editor ─────────────────────────────────────
function InlineWidth({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [local,   setLocal]   = useState(value)

  const commit = () => {
    const v = local.trim() || '150px'
    // auto-append px if pure number
    const final = /^\d+$/.test(v) ? v + 'px' : v
    onChange(final)
    setEditing(false)
  }

  if (!editing) return (
    <button
      onClick={() => { setLocal(value); setEditing(true) }}
      className="group flex items-center gap-1 text-xs font-mono px-2 py-1 rounded transition-all"
      style={{color:'var(--text-700)', border:'1px solid transparent'}}
      title="คลิกเพื่อแก้ไขความกว้าง"
    >
      {value}
      <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity"/>
    </button>
  )

  return (
    <div className="flex items-center gap-1">
      {/* Preset dropdown */}
      <select
        className="text-xs border rounded px-1 py-1 focus:outline-none w-24"
        style={{borderColor:'var(--border)', background:'var(--bg-card)', color:'var(--text-700)'}}
        value={WIDTHS.includes(local) ? local : ''}
        onChange={e => { if (e.target.value) { setLocal(e.target.value); onChange(e.target.value); setEditing(false) } }}
      >
        <option value="">— preset —</option>
        {WIDTHS.map(w => <option key={w} value={w}>{w}</option>)}
      </select>
      {/* Custom input */}
      <input
        autoFocus
        className="text-xs border rounded px-2 py-1 w-20 font-mono focus:outline-none"
        style={{borderColor:'var(--border)', background:'var(--bg-card)', color:'var(--text-700)'}}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') setEditing(false) }}
        onBlur={commit}
      />
      <button onMouseDown={e => e.preventDefault()} onClick={commit} className="text-green-600 hover:text-green-700 p-0.5"><Check size={14}/></button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => setEditing(false)} className="p-0.5" style={{color:'var(--text-400)'}}><X size={14}/></button>
    </div>
  )
}

// ─── Inline Height editor (rows for textarea) ─────────────────
function InlineHeight({ value, onChange }) {
  const [editing, setEditing] = useState(false)

  if (!editing) return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1 text-xs px-2 py-1 rounded transition-all"
      style={{color:'var(--text-700)', border:'1px solid transparent'}}
      title="คลิกเพื่อแก้ไขความสูง"
    >
      {value} แถว
      <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity"/>
    </button>
  )

  return (
    <div className="flex items-center gap-1">
      <select
        autoFocus
        className="text-xs border rounded px-1 py-1 focus:outline-none"
        style={{borderColor:'var(--border)', background:'var(--bg-card)', color:'var(--text-700)'}}
        value={value}
        onChange={e => { onChange(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
      >
        {HEIGHTS.map(h => (
          <option key={h} value={h}>{h} แถว</option>
        ))}
      </select>
      <button onClick={() => setEditing(false)} className="p-0.5" style={{color:'var(--text-400)'}}><X size={14}/></button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Main WebBuilder
// ════════════════════════════════════════════════════════════
export default function WebBuilder() {
  const { canAdd, canEdit, canDelete } = usePagePerms('webbuilder')
  const toast = useToast()

  // ── Shared config state (updates all pages instantly) ────
  const { menus, setMenus, reload: reloadCtx } = useWebBuilderConfig()

  const [selectedId, setSelectedId] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  // Menu modal
  const [menuModal,    setMenuModal]   = useState(false)
  const [menuForm,     setMenuForm]    = useState(EMPTY_MENU)

  // Column modal
  const [colModal,     setColModal]    = useState(false)
  const [colForm,      setColForm]     = useState(EMPTY_COL)

  // Options modal (standalone — for select columns)
  const [optModal,     setOptModal]    = useState(false)
  const [optColId,     setOptColId]    = useState(null)
  const [optList,      setOptList]     = useState([])
  const [optNewLabel,  setOptNewLabel] = useState('')
  const [optNewValue,  setOptNewValue] = useState('')
  const [optNewColor,  setOptNewColor] = useState('')

  const selectedMenu = menus.find(m => m.id === selectedId)

  // ── Refresh from Supabase ────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try { await reloadCtx() }
    catch(e) { toast.error('โหลดข้อมูลไม่สำเร็จ', e.message) }
    finally { setLoading(false) }
  }, [reloadCtx])

  // ── Reset to app defaults ────────────────────────────────
  const resetToDefaults = async () => {
    if (!confirm('รีเซ็ตเมนูทั้งหมดเป็นค่าเริ่มต้นของแอป? การเปลี่ยนแปลงปัจจุบันจะหายไป')) return
    await saveConfig(DEFAULT_APP_MENUS)
    setSelectedId(null)
  }

  // ── Save config (upsert — no unique-key conflict) ────────
  const saveConfig = async (updatedMenus) => {
    setMenus(updatedMenus)   // optimistic: update UI + all pages instantly
    setSaving(true)
    try {
      const value = JSON.stringify(updatedMenus)
      await AppConfigAPI.upsertBy('key', { key: CONFIG_KEY, value })
      await reloadCtx()   // sync all pages with normalized DB data
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch(e) { toast.error('บันทึกไม่สำเร็จ', e.message) }
    finally { setSaving(false) }
  }

  // ── Menu CRUD ────────────────────────────────────────────
  const openAddMenu  = () => { setMenuForm({ ...EMPTY_MENU, id: uid(), order: menus.length }); setMenuModal(true) }
  const openEditMenu = (m) => { setMenuForm({ ...m }); setMenuModal(true) }

  const submitMenu = async () => {
    const err = validateMenu(menuForm)
    if (err) return toast.warning('กรุณากรอกข้อมูล', err)
    const isEdit = menus.some(m => m.id === menuForm.id)
    let updated
    if (isEdit) {
      updated = menus.map(m => m.id === menuForm.id ? menuForm : m)
    } else {
      updated = [...menus, menuForm]
    }
    await saveConfig(updated)
    toast.success(isEdit ? 'แก้ไขเมนูสำเร็จ' : 'เพิ่มเมนูสำเร็จ', menuForm.label)
    setMenuModal(false)
  }

  const deleteMenu = (id) => {
    if (!confirm('ลบเมนูนี้?')) return
    const updated = menus.filter(m => m.id !== id)
    if (selectedId === id) setSelectedId(null)
    saveConfig(updated)
  }

  const moveMenu = (id, dir) => {
    const i   = menus.findIndex(m => m.id === id)
    const arr = moveItem(menus, i, dir)
    arr.forEach((m, idx) => { m.order = idx })
    saveConfig(arr)
  }

  // ── Column CRUD ──────────────────────────────────────────
  const openAddCol  = () => {
    if (!selectedMenu) return
    setColForm({ ...EMPTY_COL, id: uid(), order: selectedMenu.columns.length })
    setColModal(true)
  }
  const openEditCol = (col) => { setColForm({ ...col }); setColModal(true) }

  const submitCol = async () => {
    const cols = selectedMenu.columns
    const err  = validateCol(colForm, cols)
    if (err) return toast.warning('กรุณากรอกข้อมูล', err)
    const isNew = !cols.find(c => c.id === colForm.id)
    const updatedCols = isNew
      ? [...cols, colForm]
      : cols.map(c => c.id === colForm.id ? colForm : c)
    const updated = menus.map(m => m.id === selectedId ? { ...m, columns: updatedCols } : m)
    await saveConfig(updated)
    toast.success(isNew ? 'เพิ่มคอลัมน์สำเร็จ' : 'แก้ไขคอลัมน์สำเร็จ', colForm.label)
    setColModal(false)
  }

  const deleteCol = (colId) => {
    if (!confirm('ลบคอลัมน์นี้?')) return
    const updatedCols = selectedMenu.columns.filter(c => c.id !== colId)
    const updated     = menus.map(m => m.id === selectedId ? { ...m, columns: updatedCols } : m)
    saveConfig(updated)
  }

  // ── Options Modal (standalone) ───────────────────────────
  const openOptModal = (col) => {
    setOptColId(col.id)
    setOptList(col.options ? col.options.map(o => ({ ...o })) : [])
    setOptNewLabel(''); setOptNewValue(''); setOptNewColor('')
    setOptModal(true)
  }

  const addOpt = () => {
    if (!optNewLabel.trim()) return
    setOptList(p => [...p, { id: uid(), label: optNewLabel.trim(), value: optNewValue.trim() || optNewLabel.trim(), color: optNewColor }])
    setOptNewLabel(''); setOptNewValue(''); setOptNewColor('')
  }

  const removeOpt = (id) => setOptList(p => p.filter(o => o.id !== id))

  const updateOpt = (id, field, val) =>
    setOptList(p => p.map(o => o.id === id ? { ...o, [field]: val } : o))

  const moveOpt = (idx, dir) => {
    setOptList(prev => moveItem(prev, idx, dir))
  }

  const saveOptions = async () => {
    const updatedCols = selectedMenu.columns.map(c =>
      c.id === optColId ? { ...c, options: optList } : c
    )
    const updated = menus.map(m => m.id === selectedId ? { ...m, columns: updatedCols } : m)
    await saveConfig(updated)
    toast.success('บันทึก Options สำเร็จ', `${optList.length} ตัวเลือก`)
    setOptModal(false)
  }

  // ── Inline update single col field ──────────────────────
  const updateColField = (colId, field, value) => {
    const updatedCols = selectedMenu.columns.map(c =>
      c.id === colId ? { ...c, [field]: value } : c
    )
    const updated = menus.map(m => m.id === selectedId ? { ...m, columns: updatedCols } : m)
    saveConfig(updated)
  }

  const moveCol = (colId, dir) => {
    const i   = selectedMenu.columns.findIndex(c => c.id === colId)
    const arr = moveItem(selectedMenu.columns, i, dir)
    arr.forEach((c, idx) => { c.order = idx })
    const updated = menus.map(m => m.id === selectedId ? { ...m, columns: arr } : m)
    saveConfig(updated)
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">

      {/* ══ LEFT: Menu List ══════════════════════════════════ */}
      <div className="w-64 flex-shrink-0 flex flex-col overflow-hidden" style={{background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12}}>
        <div className="flex items-center justify-between" style={{background:'var(--bg-thead)', borderBottom:'1px solid var(--border)', padding:'12px 16px'}}>
          <span className="font-semibold text-sm" style={{color:'var(--text-900)'}}>เมนู</span>
          <div className="flex gap-1">
            <button className="p-1" style={{color:'var(--text-400)'}} onClick={load} title="รีเฟรช">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
            </button>
            <button className="p-1" style={{color:'var(--text-400)'}} onClick={resetToDefaults} title="โหลดค่าเริ่มต้น (Reset to Defaults)">
              <Database size={14}/>
            </button>
            {canAdd && <button className="btn-primary py-1 px-2 text-xs" onClick={openAddMenu}>
              <Plus size={13}/> เพิ่ม
            </button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {menus.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-xs" style={{color:'var(--text-400)'}}>
              <Layers size={28} className="opacity-40"/>
              <span>ยังไม่มีเมนู</span>
              <button className="btn-outline text-xs py-1 px-3" onClick={resetToDefaults}>
                <Database size={12}/> โหลดค่าเริ่มต้น
              </button>
            </div>
          )}
          {menus.map((m, i) => {
            const isSelected = selectedId === m.id
            return (
              <div key={m.id}
                className="group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors"
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: isSelected ? '#6366f1' : 'transparent',
                  color: isSelected ? 'white' : 'var(--text-700)',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-thead)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                onClick={() => setSelectedId(m.id)}
              >
                <Icon name={m.icon} size={15} style={{color: isSelected ? 'white' : 'var(--text-400)'}}/>
                <span className="flex-1 text-sm font-medium truncate">{m.label}</span>
                <div className={`flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
                  <button onClick={e=>{e.stopPropagation();moveMenu(m.id,-1)}} disabled={i===0}
                    className="p-0.5 rounded disabled:opacity-20"
                    style={{color: isSelected ? 'white' : 'var(--text-400)'}}>
                    <ChevronUp size={13}/>
                  </button>
                  <button onClick={e=>{e.stopPropagation();moveMenu(m.id,1)}} disabled={i===menus.length-1}
                    className="p-0.5 rounded disabled:opacity-20"
                    style={{color: isSelected ? 'white' : 'var(--text-400)'}}>
                    <ChevronDown size={13}/>
                  </button>
                  {canEdit && <button onClick={e=>{e.stopPropagation();openEditMenu(m)}}
                    className="p-0.5 rounded"
                    style={{color: isSelected ? 'white' : 'var(--text-400)'}}>
                    <Pencil size={12}/>
                  </button>}
                  {canDelete && <button onClick={e=>{e.stopPropagation();deleteMenu(m.id)}}
                    className="p-0.5 rounded"
                    style={{color: isSelected ? 'white' : 'var(--text-400)'}}>
                    <Trash2 size={12}/>
                  </button>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-3 py-2 text-xs text-center" style={{borderTop:'1px solid var(--border)', background:'var(--bg-thead)', color:'var(--text-400)'}}>
          {saving ? 'กำลังบันทึก...' : saved ? '✓ บันทึกแล้ว' : `${menus.length} เมนู`}
        </div>
      </div>

      {/* ══ RIGHT: Column List ═══════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12}}>
        {!selectedMenu ? (
          <div className="flex flex-col items-center justify-center h-full" style={{color:'var(--text-400)'}}>
            <Columns size={40} className="mb-3 opacity-30"/>
            <p className="text-sm">เลือกเมนูทางซ้ายเพื่อจัดการคอลัมน์</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0" style={{background:'var(--bg-thead)', borderBottom:'1px solid var(--border)', padding:'12px 20px'}}>
              <div className="flex items-center gap-2">
                <Icon name={selectedMenu.icon} size={16} style={{color:'var(--text-700)'}}/>
                <span className="font-semibold text-sm" style={{color:'var(--text-900)'}}>{selectedMenu.label}</span>
                <code className="text-xs px-2 py-0.5 rounded" style={{background:'var(--bg-page)', color:'var(--text-500)'}}>{selectedMenu.route}</code>
              </div>
              {canAdd && <button className="btn-primary text-xs py-1 px-3" onClick={openAddCol}>
                <Plus size={13}/> เพิ่มคอลัมน์
              </button>}
            </div>

            {/* Column Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead style={{background:'var(--bg-thead)', borderBottom:'1px solid var(--border)', position:'sticky', top:0}}>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold w-16" style={{color:'var(--text-500)'}}>ลำดับ</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold" style={{color:'var(--text-500)'}}>Field</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold" style={{color:'var(--text-500)'}}>Label</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold" style={{color:'var(--text-500)'}}>ประเภท</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold" style={{color:'var(--text-500)'}}>กว้าง</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold" style={{color:'var(--text-500)'}}>สูง</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold" style={{color:'var(--text-500)'}}>จำเป็น</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold" style={{color:'var(--text-500)'}}>Options</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold w-28" style={{color:'var(--text-500)'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMenu.columns.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-12 text-sm" style={{color:'var(--text-400)'}}>
                      ยังไม่มีคอลัมน์ — กด "+ เพิ่มคอลัมน์" เพื่อเริ่ม
                    </td></tr>
                  )}
                  {selectedMenu.columns.map((col, i) => (
                    <tr key={col.id} className="transition-colors"
                      style={{borderBottom:'1px solid var(--border-subtle)'}}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg-thead)'}
                      onMouseLeave={e => e.currentTarget.style.background=''}
                    >
                      <td className="px-3 py-2">
                        <div className="flex gap-0.5">
                          <button onClick={() => moveCol(col.id,-1)} disabled={i===0}
                            className="p-0.5 disabled:opacity-20" style={{color:'var(--text-400)'}}>
                            <ChevronUp size={14}/>
                          </button>
                          <button onClick={() => moveCol(col.id,1)} disabled={i===selectedMenu.columns.length-1}
                            className="p-0.5 disabled:opacity-20" style={{color:'var(--text-400)'}}>
                            <ChevronDown size={14}/>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <code className="text-xs px-1.5 py-0.5 rounded" style={{background:'var(--bg-page)', color:'var(--text-700)'}}>{col.field}</code>
                      </td>
                      <td className="px-3 py-2 font-medium" style={{color:'var(--text-900)'}}>{col.label}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {COL_TYPES.find(t => t.value===col.type)?.label || col.type}
                        </span>
                      </td>
                      {/* Width — inline editable */}
                      <td className="px-3 py-2">
                        <InlineWidth value={col.width} onChange={v => updateColField(col.id,'width',v)} />
                      </td>
                      {/* Height — inline editable (textarea only) */}
                      <td className="px-3 py-2">
                        {col.type === 'textarea'
                          ? <InlineHeight value={col.height} onChange={v => updateColField(col.id,'height',v)} />
                          : <span className="text-xs" style={{color:'var(--text-400)'}}>—</span>
                        }
                      </td>
                      <td className="px-3 py-2">
                        {col.required
                          ? <span className="text-xs text-red-600 font-semibold">✓ จำเป็น</span>
                          : <span className="text-xs" style={{color:'var(--text-400)'}}>—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {col.type === 'select' ? (
                          <button
                            onClick={() => openOptModal(col)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                          >
                            <ListOrdered size={12}/>
                            {col.options?.length || 0} ตัวเลือก
                          </button>
                        ) : <span className="text-xs" style={{color:'var(--text-400)'}}>—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {canEdit && <button onClick={() => openEditCol(col)}
                            className="btn-outline py-1 px-2 text-xs"><Pencil size={12}/></button>}
                          {col.type === 'select' && (
                            <button onClick={() => openOptModal(col)}
                              className="btn-outline py-1 px-2 text-xs text-blue-600 border-blue-300 hover:bg-blue-50">
                              <ListOrdered size={12}/>
                            </button>
                          )}
                          {canDelete && <button onClick={() => deleteCol(col.id)}
                            className="btn-danger py-1 px-2 text-xs"><Trash2 size={12}/></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ══ MENU MODAL ═══════════════════════════════════════ */}
      <Modal open={menuModal} onClose={() => setMenuModal(false)}
        title={menus.find(m=>m.id===menuForm.id) ? 'แก้ไขเมนู' : 'เพิ่มเมนู'}
        size="sm"
        footer={<>
          <button className="btn-outline" onClick={() => setMenuModal(false)}>ยกเลิก</button>
          <button className="btn-primary" onClick={submitMenu} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : <><Save size={14}/> บันทึก</>}
          </button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">ชื่อเมนู *</label>
            <input className="input" value={menuForm.label}
              onChange={e => setMenuForm(p=>({...p, label:e.target.value}))} placeholder="เช่น เครื่องจักร"/>
          </div>
          <div>
            <label className="label">เส้นทางหน้า (URL Path) *</label>
            <input className="input" value={menuForm.route}
              onChange={e => setMenuForm(p=>({...p, route:e.target.value}))} placeholder="เช่น /machines"/>
          </div>
          <div>
            <label className="label">ไอคอน</label>
            <div className="grid grid-cols-6 gap-1.5 border rounded-lg p-2 max-h-36 overflow-y-auto" style={{borderColor:'var(--border)'}}>
              {ICONS.map(name => {
                const active = menuForm.icon === name
                return (
                  <button key={name} title={name}
                    className="flex items-center justify-center p-2 rounded-lg transition-colors"
                    style={active ? {background:'#6366f1', color:'white'} : {color:'var(--text-500)'}}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background='var(--bg-thead)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background='' }}
                    onClick={() => setMenuForm(p=>({...p, icon:name}))}>
                    <Icon name={name} size={16}/>
                  </button>
                )
              })}
            </div>
            <p className="text-xs mt-1" style={{color:'var(--text-400)'}}>เลือก icon: <strong>{menuForm.icon}</strong></p>
          </div>
        </div>
      </Modal>

      {/* ══ OPTIONS MODAL ════════════════════════════════════ */}
      <Modal
        open={optModal}
        onClose={() => setOptModal(false)}
        title={`จัดการ Dropdown — ${selectedMenu?.columns.find(c=>c.id===optColId)?.label || ''}`}
        size="md"
        footer={<>
          <button className="btn-outline" onClick={() => setOptModal(false)}>ยกเลิก</button>
          <button className="btn-primary" onClick={saveOptions} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : <><Save size={14}/> บันทึก</>}
          </button>
        </>}
      >
        <div className="space-y-3">
          {/* Option List */}
          <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto" style={{borderColor:'var(--border)'}}>
            {optList.length === 0 && (
              <div className="px-4 py-6 text-center text-sm" style={{color:'var(--text-400)'}}>
                ยังไม่มีตัวเลือก — เพิ่มด้านล่าง
              </div>
            )}
            {optList.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2 px-3 py-2" style={{borderBottom:'1px solid var(--border-subtle)'}}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-thead)'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveOpt(i,-1)} disabled={i===0}
                    className="disabled:opacity-20" style={{color:'var(--text-400)'}}><ChevronUp size={13}/></button>
                  <button onClick={() => moveOpt(i,1)} disabled={i===optList.length-1}
                    className="disabled:opacity-20" style={{color:'var(--text-400)'}}><ChevronDown size={13}/></button>
                </div>
                {/* Order badge */}
                <span className="text-xs w-5 text-center" style={{color:'var(--text-400)'}}>{i+1}</span>
                {/* Label */}
                <div className="flex-1">
                <label className="text-xs mb-0.5 block" style={{color:'var(--text-400)'}}>ชื่อที่แสดงผล</label>
                  <input className="input text-sm py-1" value={o.label}
                    onChange={e => updateOpt(o.id,'label',e.target.value)} />
                </div>
                {/* Value */}
                <div className="w-32">
                  <label className="text-xs mb-0.5 block" style={{color:'var(--text-400)'}}>Value (DB)</label>
                  <input className="input text-sm py-1" value={o.value}
                    onChange={e => updateOpt(o.id,'value',e.target.value)} />
                </div>
                {/* Color */}
                <div className="flex-shrink-0">
                  <label className="text-xs mb-0.5 block" style={{color:'var(--text-400)'}}>สี</label>
                  <ColorPicker value={o.color || ''} onChange={val => updateOpt(o.id,'color',val)} />
                </div>
                {/* Delete */}
                <button onClick={() => removeOpt(o.id)}
                  className="text-red-400 hover:text-red-600 flex-shrink-0 p-1 rounded">
                  <Trash2 size={15}/>
                </button>
              </div>
            ))}
          </div>

          {/* Add new option */}
          <div className="rounded-lg p-3 space-y-2" style={{background:'var(--bg-thead)'}}>
            <p className="text-xs font-semibold" style={{color:'var(--text-700)'}}>เพิ่มตัวเลือกใหม่</p>
            <div className="flex gap-2">
              <div className="flex-1">
                  <label className="text-xs mb-0.5 block" style={{color:'var(--text-400)'}}>ชื่อที่แสดงผล *</label>
                <input className="input text-sm" placeholder="เช่น RUNNING"
                  value={optNewLabel} onChange={e => setOptNewLabel(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && addOpt()} />
              </div>
              <div className="w-36">
                <label className="text-xs mb-0.5 block" style={{color:'var(--text-400)'}}>Value (ถ้าต่างจาก Label)</label>
                <input className="input text-sm" placeholder="เช่น running"
                  value={optNewValue} onChange={e => setOptNewValue(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && addOpt()} />
              </div>
              <div className="flex items-end">
                <button className="btn-primary py-2 px-3" onClick={addOpt}>
                  <Plus size={15}/>
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{color:'var(--text-400)'}}>สีป้าย (Badge Color)</label>
              <ColorPicker value={optNewColor} onChange={setOptNewColor} />
            </div>
          </div>

          <p className="text-xs" style={{color:'var(--text-400)'}}>
            ถ้า Value ว่างเปล่า จะใช้ Label เป็น Value แทน • กด Enter เพื่อเพิ่มเร็ว
          </p>
        </div>
      </Modal>

      {/* ══ COLUMN MODAL ═════════════════════════════════════ */}
      <Modal open={colModal} onClose={() => setColModal(false)}
        title={selectedMenu?.columns.find(c=>c.id===colForm.id) ? 'แก้ไขคอลัมน์' : 'เพิ่มคอลัมน์'}
        size="lg"
        footer={<>
          <button className="btn-outline" onClick={() => setColModal(false)}>ยกเลิก</button>
          <button className="btn-primary" onClick={submitCol} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : <><Save size={14}/> บันทึก</>}
          </button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Field */}
          <div>
            <label className="label">ชื่อฟิลด์ * <span className="font-normal" style={{color:'var(--text-400)'}}>(key ใน DB)</span></label>
            <input className="input font-mono" value={colForm.field}
              onChange={e => setColForm(p=>({...p, field:e.target.value}))} placeholder="เช่น machine_code"/>
          </div>
          {/* Label */}
          <div>
            <label className="label">ชื่อที่แสดงผล * <span className="font-normal" style={{color:'var(--text-400)'}}>(แสดงผล)</span></label>
            <input className="input" value={colForm.label}
              onChange={e => setColForm(p=>({...p, label:e.target.value}))} placeholder="เช่น รหัสเครื่อง"/>
          </div>
          {/* Type */}
          <div>
            <label className="label">ประเภท (Type)</label>
            <select className="select" value={colForm.type}
              onChange={e => setColForm(p=>({...p, type:e.target.value}))}>
              {COL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {/* Required */}
          <div className="flex items-end gap-3 pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className={`w-10 h-6 rounded-full relative transition-colors`}
                style={{background: colForm.required ? '#6366f1' : 'var(--bg-thead)'}}
                onClick={() => setColForm(p=>({...p, required:!p.required}))}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${colForm.required ? 'translate-x-5' : 'translate-x-1'}`}/>
              </div>
              <span className="text-sm font-medium" style={{color:'var(--text-700)'}}>จำเป็น (Required)</span>
            </label>
          </div>
          {/* Width */}
          <div>
            <label className="label">ความกว้าง (Width)</label>
            <div className="flex gap-2">
              <select className="select flex-1" value={WIDTHS.includes(colForm.width) ? colForm.width : 'custom'}
                onChange={e => { if(e.target.value!=='custom') setColForm(p=>({...p,width:e.target.value})) }}>
                {WIDTHS.map(w => <option key={w} value={w}>{w}</option>)}
                {!WIDTHS.includes(colForm.width) && <option value="custom">{colForm.width} (custom)</option>}
              </select>
              <input className="input w-24" value={colForm.width}
                onChange={e => setColForm(p=>({...p, width:e.target.value}))} placeholder="150px"/>
            </div>
          </div>
          {/* Height (textarea only) */}
          <div>
            <label className="label">จำนวนแถว (สำหรับ Textarea)</label>
            <select className="select" value={colForm.height}
              onChange={e => setColForm(p=>({...p, height:e.target.value}))}
              disabled={colForm.type !== 'textarea'}>
              {HEIGHTS.map(h => <option key={h} value={h}>{h} แถว</option>)}
            </select>
            {colForm.type !== 'textarea' && <p className="text-xs mt-0.5" style={{color:'var(--text-400)'}}>ใช้ได้เฉพาะประเภท Textarea</p>}
          </div>
          {/* Options (select only) */}
          {colForm.type === 'select' && (
            <div className="col-span-2">
              <OptionsEditor
                options={colForm.options || []}
                onChange={opts => setColForm(p=>({...p, options:opts}))}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
