import { TechnicianAPI, KpiSettingsAPI, UserAPI, CylinderAPI } from '../../api/entities'
import { db } from '../../api/dbClient'
import { buildTechFromUser } from './WorkOrders.jsx'
import { syncTechToNotifications } from './workOrderTechSync.js'

// Technician management + initial data load moved verbatim out of the
// WorkOrders component. Every free variable of the original closure is an
// explicit deps field; bodies run at call time exactly as before.

// Was the form-building part of `const openAddTech = (userToPreFill = null) => {...}`.
export function buildAddTechForm(technicians, userToPreFill = null) {
  const maxNum = technicians.reduce((max, t) => {
    const match = String(t.Technician_ID || t.id || '').match(/TECH-(\d+)/i)
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)
  const nextId = `TECH-${String(maxNum + 1).padStart(3, '0')}`
  const baseForm = {
    id: nextId,
    Technician_ID: nextId,
    Name: '',
    Phone: '',
    SkillLevel: 'Senior',
    Specialization: '',
    Status: 'ACTIVE',
    Line_ID: '',
    Telegram_ID: '',
    Avatar_URL: '',
    User_ID: '',
  }
  return {
    editingTechId: null,
    selectedUserId: userToPreFill?.id || '',
    form: userToPreFill ? buildTechFromUser(userToPreFill, baseForm) : baseForm,
  }
}

// Was the form-building part of `const openEditTech = (tech) => {...}`.
export function buildEditTechForm(tech, systemUsers) {
  const techId = tech.id || tech.Technician_ID
  const matchedUser = systemUsers.find(
    (u) => (u.id && u.id === tech.User_ID) || (u.line_user_id && u.line_user_id === (tech.Line_ID || tech.line_id))
  )
  return {
    techId,
    selectedUserId: matchedUser?.id || '',
    form: {
      ...tech,
      id: techId,
      Technician_ID: tech.Technician_ID || techId,
      Name: tech.Name || '',
      Phone: tech.Phone || '',
      SkillLevel: tech.SkillLevel || 'Senior',
      Specialization: tech.Specialization || '',
      Status: tech.Status || 'ACTIVE',
      Line_ID: tech.Line_ID || tech.line_id || '',
      Telegram_ID: tech.Telegram_ID || tech.telegram_id || '',
      Avatar_URL: tech.Avatar_URL || matchedUser?.line_picture_url || '',
      User_ID: tech.User_ID || matchedUser?.id || '',
    },
  }
}

// Was `const handleSelectUserForTech = (userId) => {...}`.
export function selectUserForTech({ userId, systemUsers, setSelectedUserId, setTechForm }) {
  setSelectedUserId(userId)
  if (!userId) return
  const userObj = systemUsers.find((u) => u.id === userId)
  if (!userObj) return
  setTechForm((prev) => buildTechFromUser(userObj, prev))
}

// Was `const handleSaveTech = async () => {...}`.
export async function saveTech({
  techForm, editingTechId, technicians, saveTechFn, setTechnicians,
  setTechModalOpen, reloadFn, toast,
}) {
  if (!techForm.Name.trim()) { toast.error('กรุณาระบุชื่อช่าง'); return }
  const targetId = editingTechId || techForm.id || techForm.Technician_ID || `TECH-${Date.now()}`
  const payload = {
    ...techForm,
    id: targetId,
    Technician_ID: techForm.Technician_ID || targetId,
  }

  try {
    let nextList
    if (editingTechId) {
      await saveTechFn.update(editingTechId, payload)
      nextList = technicians.map((t) => (t.id === editingTechId || t.Technician_ID === editingTechId ? { ...t, ...payload } : t))
      setTechnicians(nextList)
      toast.success('อัปเดตข้อมูลช่างเรียบร้อย', payload.Name)
    } else {
      const created = await saveTechFn.create(payload)
      const itemToAdd = created || payload
      nextList = [...technicians, itemToAdd]
      setTechnicians(nextList)
      toast.success('เพิ่มช่างใหม่เรียบร้อย', payload.Name)
    }
    setTechModalOpen(false)
    await syncTechToNotifications(nextList)
    await reloadFn()
  } catch (err) {
    console.warn('Backend update failed:', err)
    toast.error('ไม่สามารถบันทึกข้อมูลช่างไปยังเซิร์ฟเวอร์ได้', err.message || 'กรุณาตรวจสอบสิทธิ์หรือการเชื่อมต่อ')
  }
}

// Was `const handleDeleteTech = async (tech) => {...}`.
export async function deleteTech({
  tech, confirmFn, deleteTechFn, technicians, setTechnicians, reloadFn, toast,
}) {
  const techId = tech.id || tech.Technician_ID
  if (!confirmFn(`ยืนยันการลบช่าง "${tech.Name}" ออกจากระบบหรือไม่?`)) return
  try {
    await deleteTechFn.delete(techId)
    const nextList = technicians.filter((t) => t.id !== techId && t.Technician_ID !== techId)
    setTechnicians(nextList)
    await syncTechToNotifications(nextList)
    await reloadFn()
    toast.success('ลบข้อมูลช่างเรียบร้อย', tech.Name)
  } catch (e) {
    console.warn('Backend delete error:', e)
    toast.error('ไม่สามารถลบข้อมูลช่างได้', e.message || 'กรุณาตรวจสอบสิทธิ์หรือการเชื่อมต่อ')
  }
}

// Was `const loadTechsAndSettings = async () => {...}`.
export async function loadTechData({
  setTechLoading, setSystemUsers, setCylinders, setTechnicians,
  setKpiTargets, setDraftKpi, defaultKpiTargets, defaultTechs,
}) {
  setTechLoading(true)
  try {
    const [techRes, kpiRes, usersRes, cylRes] = await Promise.allSettled([
      TechnicianAPI.list(),
      KpiSettingsAPI.list(),
      UserAPI.list(),
      CylinderAPI.list(),
    ])

    if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
      setSystemUsers(usersRes.value)
    }

    if (cylRes.status === 'fulfilled' && Array.isArray(cylRes.value) && cylRes.value.length > 0) {
      setCylinders(cylRes.value)
    } else {
      const stored =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('textileops_tbl_cylinders') || localStorage.getItem('txops_tbl_cylinders')
          : null
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCylinders(parsed)
          }
        } catch {}
      }
    }

    if (techRes.status === 'fulfilled' && Array.isArray(techRes.value)) {
      setTechnicians(techRes.value)
    } else {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('txops_tbl_technicians') : null
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTechnicians(parsed)
          } else {
            setTechnicians(defaultTechs)
            localStorage.setItem('txops_tbl_technicians', JSON.stringify(defaultTechs))
          }
        } catch {
          setTechnicians(defaultTechs)
          localStorage.setItem('txops_tbl_technicians', JSON.stringify(defaultTechs))
        }
      } else {
        setTechnicians(defaultTechs)
        try { localStorage.setItem('txops_tbl_technicians', JSON.stringify(defaultTechs)) } catch {}
      }
    }

    if (kpiRes.status === 'fulfilled' && Array.isArray(kpiRes.value)) {
      const map = { ...defaultKpiTargets }
      kpiRes.value.forEach((item) => {
        if (item.Key === 'kpi_target_repair') map.REPAIR = parseFloat(item.Value) || 1.0
        if (item.Key === 'kpi_target_design') map.DESIGN = parseFloat(item.Value) || 3.0
        if (item.Key === 'kpi_target_pm')     map.PM = parseFloat(item.Value) || 2.0
        if (item.Key === 'kpi_target_setup')  map.SETUP = parseFloat(item.Value) || 1.0
      })
      setKpiTargets(map)
      setDraftKpi(map)
    }
  } catch (err) {
    console.warn('Could not load technicians/settings, using defaults:', err)
    setTechnicians(defaultTechs)
  } finally {
    setTechLoading(false)
  }
}

// Was `const handleDrilldownByCause = (causeKey) => {...}`.
export function drilldownByCause({ causeKey, setCauseFilter, setCurrentTab }) {
  setCauseFilter(causeKey)
  setCurrentTab('records')
}
