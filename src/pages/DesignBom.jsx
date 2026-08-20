import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { DesignBomAPI } from '../api/entities'
import useWebBuilderMenu from '../hooks/useWebBuilderMenu'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import DetailDrawer from '../components/ui/DetailDrawer'
import { useToast } from '../components/ui/Toast'
import F from '../components/ui/FormField'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'

const DESIGN_BOM_IMAGE_FOLDER = 'Design-BOM'
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'design_bom'|column design_bom\.([^ ]+) does not exist/i

function extractImageUrl(note = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(IMAGE_NOTE_PREFIX))
  return line?.trim().slice(IMAGE_NOTE_PREFIX.length).trim() || ''
}

function stripImageUrlMeta(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith(IMAGE_NOTE_PREFIX))
    .join('\n')
    .trim()
}

function getDesignImageUrl(row = {}) {
  return row.ImageUrl || extractImageUrl(row.Comment) || ''
}

function appendDesignImageMeta(comment = '', imageUrl = '') {
  const cleanComment = stripImageUrlMeta(comment)
  return [cleanComment, imageUrl ? `${IMAGE_NOTE_PREFIX} ${imageUrl}` : ''].filter(Boolean).join('\n')
}

function omitKeys(item, keys = []) {
  const clone = { ...item }
  keys.forEach((key) => { delete clone[key] })
  return clone
}

function getMissingDesignColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

const getFallbackCols = () => [
  { field:'MC',          label:'MC',          type:'text' },
  { field:'Design',      label:'แบบงาน',     type:'text' },
  { field:'KI',          label:'KI',          type:'text' },
  { field:'BOM',         label:'BOM',         type:'text' },
  { field:'CL1',         label:'CL1',         type:'text' },
  { field:'CL2',         label:'CL2',         type:'text' },
  { field:'CL3',         label:'CL3',         type:'text' },
  { field:'CL4',         label:'CL4',         type:'text' },
  { field:'SP',          label:'SP',          type:'text' },
  { field:'SL1',         label:'SL1',         type:'text' },
  { field:'SL2',         label:'SL2',         type:'text' },
  { field:'SL3',         label:'SL3',         type:'text' },
  { field:'SL4',         label:'SL4',         type:'text' },
  { field:'ImageUrl',    label:'URL',         type:'text', width:'220px' },
  { field:'ImagePreview',label:'รูป',         type:'text', width:'110px' },
  { field:'Comment',     label:'หมายเหตุ',    type:'text' },
  { field:'LastUpdated', label:'อัปเดตล่าสุด', type:'date' },
]

const REQUIRED_IMAGE_COLS = [
  { field:'ImageUrl',     label:'URL', type:'text', width:'220px' },
  { field:'ImagePreview', label:'รูป', type:'text', width:'110px' },
]

function resolveDesignColumns(wbCols) {
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : getFallbackCols()
  const nextCols = [...sourceCols]
  REQUIRED_IMAGE_COLS.forEach((requiredCol) => {
    if (!nextCols.some((col) => col.field === requiredCol.field)) {
      const commentIndex = nextCols.findIndex((col) => col.field === 'Comment')
      nextCols.splice(commentIndex >= 0 ? commentIndex : nextCols.length, 0, requiredCol)
    }
  })
  return nextCols
}

function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

const EMPTY = {
  MC:'', Design:'', KI:'', BOM:'',
  CL1:'', CL2:'', CL3:'', CL4:'', SP:'',
  SL1:'', SL2:'', SL3:'', SL4:'',
  ImageUrl:'',
  Comment:'', LastUpdated:'',
}

function renderCell(row, col) {
  const v = col.field === 'ImageUrl' || col.field === 'ImagePreview'
    ? getDesignImageUrl(row)
    : col.field === 'Comment'
      ? stripImageUrlMeta(row.Comment)
      : row[col.field]
  if (v === null || v === undefined || v === '') return <span style={{ color:'var(--text-400)' }}>-</span>
  if (col.field === 'ImageUrl') {
    return <a href={String(v)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(v)}</a>
  }
  if (col.field === 'ImagePreview') {
    return <a href={String(v)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12 }}>เปิดรูป</a>
  }
  if (col.field === 'LastUpdated' || col.type === 'date') {
    try { return <span style={{ fontSize:11 }}>{format(new Date(v), 'dd/MM/yy')}</span> }
    catch { return <span>{String(v)}</span> }
  }
  return <span style={{ fontSize:12 }}>{String(v)}</span>
}

export default function DesignBom() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('designbom')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(DesignBomAPI)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [detailRec, setDetailRec] = useState(null)
  const [filterSort, setFilterSort] = useState(INIT_FS)

  const wbCols = useWebBuilderMenu('/design-bom')
  const cols = resolveDesignColumns(wbCols)

  const filtered = data.filter((r) =>
    [r.MC, r.Design, r.KI, r.BOM, stripImageUrlMeta(r.Comment), getDesignImageUrl(r)].some((v) =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  )
  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    valueGetters: {
      ImageUrl: getDesignImageUrl,
      ImagePreview: getDesignImageUrl,
      Comment: (row) => stripImageUrlMeta(row.Comment),
    },
  }), [cols])
  const displayRows = useMemo(() => applyFilterSort(filtered, FS_COLS, filterSort), [filtered, FS_COLS, filterSort])

  const openNew = () => { setForm(EMPTY); setModal(true) }
  const openEdit = (r) => { setForm({ ...r, ImageUrl: getDesignImageUrl(r), Comment: stripImageUrlMeta(r.Comment) }); setModal(true); setDetailRec(null) }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: DESIGN_BOM_IMAGE_FOLDER })
      setForm((prev) => ({ ...prev, ImageUrl: imageUrl }))
      toast.success('อัปโหลดรูปสำเร็จ', `บันทึกไว้ในโฟลเดอร์ ${DESIGN_BOM_IMAGE_FOLDER}`)
    } catch (e) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', e.message)
    }
    setUploadingImage(false)
  }

  const saveWithImageFallback = async (payload) => {
    try {
      await save(payload)
    } catch (error) {
      const missingColumn = getMissingDesignColumn(error)
      if (missingColumn === 'ImageUrl') {
        await save(omitKeys(payload, ['ImageUrl']))
        toast.success('บันทึกลิงก์รูปในหมายเหตุแล้ว', 'ฐานข้อมูลยังไม่มีคอลัมน์ ImageUrl ของ Design/BOM')
        return
      }
      throw error
    }
  }

  const submit = async () => {
    if (!form.MC && !form.Design && !form.KI) return toast.warning('กรุณากรอกข้อมูล', 'ระบุ MC หรือแบบงานหรือ KI อย่างน้อย 1 ช่อง')
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      await saveWithImageFallback({
        ...form,
        Comment: appendDesignImageMeta(form.Comment, form.ImageUrl),
        LastUpdated: format(new Date(), 'yyyy-MM-dd'),
      })
      toast.success(isEdit ? 'แก้ไข Design/BOM สำเร็จ' : 'เพิ่ม Design/BOM สำเร็จ', form.Design || form.MC || form.KI)
      setModal(false)
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return
    try {
      await remove(id)
      toast.success('ลบรายการสำเร็จ')
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหา MC / แบบงาน / KI / BOM..." />
        <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
        <GoogleSheetSyncButton
          sheetName="Design BOM"
          columns={cols}
          rows={displayRows}
          valueGetters={{
            ImageUrl: getDesignImageUrl,
            ImagePreview: getDesignImageUrl,
            Comment: (row) => stripImageUrlMeta(row.Comment),
          }}
        />
        <button className="btn-outline ml-auto" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
        {canAdd && <button className="btn-primary" onClick={openNew}><Plus size={15}/> เพิ่ม Design/BOM</button>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c => <th key={c.field || c.id} style={getColumnWidthStyle(c)}>{c.label}</th>)}
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={cols.length + 1} className="text-center py-8" style={{ color:'var(--text-400)' }}>{t('loading')}</td></tr>}
            {!loading && displayRows.map((r, i) => (
              <tr key={r._id || r.id || i} onClick={() => setDetailRec(r)} style={{ cursor:'pointer' }}>
                {cols.map(c => <td key={c.field || c.id} style={getColumnWidthStyle(c)}>{renderCell(r, c)}</td>)}
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    {canEdit && <button className="btn-outline py-1 px-2 text-xs" onClick={() => openEdit(r)}><Pencil size={12}/></button>}
                    {canDelete && <button className="btn-danger py-1 px-2 text-xs" onClick={() => del(r._id || r.id)}><Trash2 size={12}/></button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !displayRows.length && <tr><td colSpan={cols.length + 1} className="text-center py-8" style={{ color:'var(--text-400)' }}>{t('no_data')}</td></tr>}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={!!detailRec}
        onClose={() => setDetailRec(null)}
        title={detailRec?.Design || detailRec?.MC || 'Design/BOM'}
        subtitle={detailRec?.KI || detailRec?.BOM}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        groups={detailRec ? [
          {
            label: 'ข้อมูลหลัก',
            fields: [
              { label:'MC', value:detailRec.MC },
              { label:'แบบงาน', value:detailRec.Design },
              { label:'KI', value:detailRec.KI },
              { label:'BOM', value:detailRec.BOM },
            ].filter(f => f.value),
          },
          {
            label: 'CL / SP',
            fields: [
              { label:'CL1', value:detailRec.CL1 },
              { label:'CL2', value:detailRec.CL2 },
              { label:'CL3', value:detailRec.CL3 },
              { label:'CL4', value:detailRec.CL4 },
              { label:'SP', value:detailRec.SP },
            ].filter(f => f.value),
          },
          {
            label: 'SL',
            fields: [
              { label:'SL1', value:detailRec.SL1 },
              { label:'SL2', value:detailRec.SL2 },
              { label:'SL3', value:detailRec.SL3 },
              { label:'SL4', value:detailRec.SL4 },
            ].filter(f => f.value),
          },
          {
            label: 'รูป Master',
            fields: [
              { label:'ลิงก์รูป', value:getDesignImageUrl(detailRec), full:true },
            ].filter(f => f.value),
          },
          {
            label: 'อื่นๆ',
            fields: [
              { label:'หมายเหตุ', value:stripImageUrlMeta(detailRec.Comment), full:true },
              { label:'อัปเดตล่าสุด', value:detailRec.LastUpdated ? format(new Date(detailRec.LastUpdated), 'dd/MM/yyyy') : null },
            ].filter(f => f.value),
          },
        ].filter(g => g.fields.length > 0) : []}
      />

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id ? 'แก้ไข Design/BOM' : 'เพิ่ม Design/BOM'}
        size="lg"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          <F form={form} setForm={setForm} label="MC" id="MC" />
          <F form={form} setForm={setForm} label="แบบงาน" id="Design" />
          <F form={form} setForm={setForm} label="KI" id="KI" />
          <F form={form} setForm={setForm} label="BOM" id="BOM" />
          <F form={form} setForm={setForm} label="CL1" id="CL1" />
          <F form={form} setForm={setForm} label="CL2" id="CL2" />
          <F form={form} setForm={setForm} label="CL3" id="CL3" />
          <F form={form} setForm={setForm} label="CL4" id="CL4" />
          <F form={form} setForm={setForm} label="SP" id="SP" />
          <F form={form} setForm={setForm} label="SL1" id="SL1" />
          <F form={form} setForm={setForm} label="SL2" id="SL2" />
          <F form={form} setForm={setForm} label="SL3" id="SL3" />
          <F form={form} setForm={setForm} label="SL4" id="SL4" />
          <F form={form} setForm={setForm} label="ลิงก์รูป (Google Drive)" id="ImageUrl" useBuilder={false} />
          <div>
            <label className="label">อัปโหลดรูปเข้าโฟลเดอร์ Master</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => onPickImageFile(e.target.files?.[0])}
            />
            {uploadingImage && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-500)' }}>กำลังอัปโหลดรูป...</div>}
            {form.ImageUrl && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text-500)' }}>ลิงก์รูป:</span>{' '}
                <a href={form.ImageUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}>
                  {form.ImageUrl}
                </a>
              </div>
            )}
          </div>
          <div className="col-span-2">
            <F form={form} setForm={setForm} label="หมายเหตุ" id="Comment" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
