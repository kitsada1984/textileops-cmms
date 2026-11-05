import { useState, useEffect } from 'react'
import { TelegramSettings } from './telegramSettings.jsx'
import { LineSettings } from './lineSettings.jsx'
import { db } from '../../api/dbClient'
import {
  Save, Database, User, Shield, CheckCircle, AlertCircle, RefreshCw,
  Smartphone, Download, Bell, Eye, EyeOff,
  Lock, ShieldAlert, AlertTriangle, KeyRound, Sparkles, ExternalLink, BookOpen
} from 'lucide-react'
import { useT } from '../../contexts/LanguageContext'
import { useAuth, hashPassword } from '../../contexts/AuthContext'
import { APP_VERSION, APP_BUILD_DATE } from '../../version'
import { fetchTelegramContacts, loadTelegramSettings, saveTelegramSettings, saveTelegramSettingsDB, loadTelegramSettingsDB, testTelegram } from '../../utils/telegram'
import { fetchLineContacts, loadLineSettings, saveLineSettingsDB, loadLineSettingsDB, testLineNotification, DEFAULT_LINE_SETTINGS } from '../../utils/line'
import { useRealtimeTables } from '../../api/realtimeSync'
import { useToast } from '../../components/ui/Toast'
import usePagePerms from '../../hooks/usePagePerms'
import { syncNotificationTechsToRegistry } from '../../utils/technicianSync'
import Modal from '../../components/ui/Modal'
import { telegramAdminSchema } from '../../schemas/telegramAdminSchema'
import { getGeminiConfig, saveGeminiConfig, testGeminiConnection, DEFAULT_GEMINI_MODEL } from '../../utils/geminiVision'

import Card from '../../components/ui/Card'
import { TABLES, SectionCard } from './settingsComponents.jsx'

export default function SettingsPage() {
  const { t } = useT()
  const { user, refreshUser } = useAuth()
  const { canEdit, canDelete } = usePagePerms('settings')
  const toast = useToast()
  const [counts,     setCounts]     = useState({})
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg,     setPwdMsg]     = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  const [tg,        setTg]         = useState(() => {
    const saved = loadTelegramSettings()
    if (!saved.admins) saved.admins = [{ name: 'กฤษดา (Admin)', chat_id: '6981653027' }]
    if (!saved.supervisors) saved.supervisors = saved.supervisor_chat_id ? [{ name: 'Supervisor', chat_id: saved.supervisor_chat_id }] : []
    if (!saved.technicians) saved.technicians = saved.technician_chat_id ? [{ name: 'ช่างเทคนิค', chat_id: saved.technician_chat_id }] : []
    return saved
  })
  const [tgMsg,     setTgMsg]      = useState('')
  const [tgTesting, setTgTesting]  = useState(false)
  const [tgContacts, setTgContacts] = useState([])
  const [tgContactLoading, setTgContactLoading] = useState(false)

  // Admin Management & Double-Confirmation Password Security Modal
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminModalMode, setAdminModalMode] = useState('add') // 'add' | 'edit' | 'delete'
  const [adminModalIndex, setAdminModalIndex] = useState(-1)
  const [adminFormName, setAdminFormName] = useState('')
  const [adminFormChatId, setAdminFormChatId] = useState('')
  const [adminAuthPwd, setAdminAuthPwd] = useState('')
  const [adminAuthError, setAdminAuthError] = useState('')
  const [adminStep, setAdminStep] = useState(1) // 1: Password Auth, 2: Final Double Confirmation
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [showAdminPwd, setShowAdminPwd] = useState(false)

  // LINE Notification State
  const [line, setLine] = useState(DEFAULT_LINE_SETTINGS)
  const [lineMsg, setLineMsg] = useState('')
  const [lineIsOk, setLineIsOk] = useState(true)
  const [lineTesting, setLineTesting] = useState(false)
  const [showLineToken, setShowLineToken] = useState(false)
  const [lineContacts, setLineContacts] = useState([])
  const [lineContactLoading, setLineContactLoading] = useState(false)
  const [webhookCopied, setWebhookCopied] = useState(false)

  // Gemini AI Vision State
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState(DEFAULT_GEMINI_MODEL)
  const [geminiTesting, setGeminiTesting] = useState(false)
  const [geminiSaving, setGeminiSaving] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [geminiStatus, setGeminiStatus] = useState(null)

  const reloadSettings = async () => {
    try {
      const { data } = await db.from('appconfigs').select('value').eq('key', 'telegram_settings').maybeSingle()
      if (data?.value) {
        const cfg = JSON.parse(data.value)
        if (!cfg.admins) cfg.admins = cfg.supervisors?.length ? cfg.supervisors : [{ name: 'กฤษดา (Admin)', chat_id: '6981653027' }]
        if (!cfg.supervisors) cfg.supervisors = []
        if (!cfg.technicians) cfg.technicians = []
        setTg(cfg)
      }
      const lineCfg = await loadLineSettingsDB()
      if (lineCfg) setLine(lineCfg)
      const geminiCfg = await getGeminiConfig()
      if (geminiCfg) {
        setGeminiKey(geminiCfg.apiKey || '')
        const loadedModel = geminiCfg.model || DEFAULT_GEMINI_MODEL
        setGeminiModel(
          loadedModel.startsWith('gemini-1.5') || loadedModel === 'gemini-2.5-flash'
            ? DEFAULT_GEMINI_MODEL
            : loadedModel
        )
      }
    } catch {}
  }

  const reloadCounts = () => {
    Promise.allSettled(
      TABLES.map(([tb]) => db.from(tb).select('id', { count: 'exact', head: true }))
    ).then(results => {
      const c = {}
      results.forEach((r, i) => {
        c[TABLES[i][0]] = r.status === 'fulfilled' ? (r.value.count ?? '—') : '—'
      })
      setCounts(c)
    })
  }

  useEffect(() => {
    ;(async () => {
      const { data } = await db.from('appconfigs').select('value').eq('key', 'telegram_settings').maybeSingle()
      if (data?.value) {
        // DB has data — load it
        const cfg = JSON.parse(data.value)
        if (!cfg.admins) cfg.admins = cfg.supervisors?.length ? cfg.supervisors : [{ name: 'กฤษดา (Admin)', chat_id: '6981653027' }]
        if (!cfg.supervisors) cfg.supervisors = []
        if (!cfg.technicians) cfg.technicians = []
        setTg(cfg)
      } else {
        // DB empty — sync localStorage → DB immediately
        const local = loadTelegramSettings()
        if (!local.admins) local.admins = [{ name: 'กฤษดา (Admin)', chat_id: '6981653027' }]
        if (!local.supervisors) local.supervisors = []
        if (!local.technicians) local.technicians = []
        setTg(local)
        saveTelegramSettingsDB(local)
      }

      // Load LINE settings from DB
      const lineCfg = await loadLineSettingsDB()
      if (lineCfg) setLine(lineCfg)
      const geminiCfg = await getGeminiConfig()
      if (geminiCfg) {
        setGeminiKey(geminiCfg.apiKey || '')
        const loadedModel = geminiCfg.model || DEFAULT_GEMINI_MODEL
        setGeminiModel(
          loadedModel.startsWith('gemini-1.5') || loadedModel === 'gemini-2.5-flash'
            ? DEFAULT_GEMINI_MODEL
            : loadedModel
        )
      }
    })()
  }, [])

  useEffect(() => {
    reloadCounts()
  }, [])

  useRealtimeTables(['appconfigs'], () => {
    reloadSettings()
  })

  useRealtimeTables(TABLES.map(t => t[0]), () => {
    reloadCounts()
  })

  const changePassword = async () => {
    setPwdMsg('')
    if (!newPwd) { setPwdMsg(t('set_pwd_req')); return }
    if (newPwd.length < 6) { setPwdMsg(t('set_pwd_short')); return }
    if (newPwd !== confirmPwd) { setPwdMsg('รหัสผ่านไม่ตรงกัน'); return }

    setPwdLoading(true)
    try {
      const hash = await hashPassword(newPwd)
      const { error } = await db
        .from('users')
        .update({ password_hash: hash })
        .eq('id', user.id)

      if (error) throw new Error(error.message)
      setPwdMsg(t('set_pwd_ok'))
      setNewPwd('')
      setConfirmPwd('')
    } catch (e) {
      setPwdMsg(e.message)
    }
    setPwdLoading(false)
  }

  const isOk = pwdMsg.includes('✓') || pwdMsg.toLowerCase().includes('success') || pwdMsg.includes('สำเร็จ')

  const saveTg = async () => {
    if (!canEdit) {
      toast.error('ไม่มีสิทธิ์ดำเนินการ', 'บัญชีของคุณไม่มีสิทธิ์แก้ไขการตั้งค่าระบบ')
      return
    }
    try {
      await saveTelegramSettingsDB(tg)
      const syncResult = await syncNotificationTechsToRegistry(tg.technicians, 'TELEGRAM')
      if (syncResult.createdCount > 0) {
        setTgMsg(`บันทึกแล้ว ✓ (เพิ่มเข้าทะเบียนช่าง ${syncResult.createdCount} ท่าน: ${syncResult.createdNames.join(', ')})`)
        toast.success('บันทึกและซิงค์ทะเบียนช่างสำเร็จ', `เพิ่มช่างใหม่เข้าทะเบียนช่าง: ${syncResult.createdNames.join(', ')}`)
      } else if (syncResult.updatedCount > 0) {
        setTgMsg('บันทึกแล้ว ✓ (อัปเดตเชื่อมโยงทะเบียนช่างเรียบร้อย)')
      } else {
        setTgMsg('บันทึกแล้ว ✓')
      }
    } catch (e) {
      setTgMsg(`ผิดพลาด: ${e.message}`)
      toast.error('เกิดข้อผิดพลาดในการบันทึก', e.message)
    }
    setTimeout(() => setTgMsg(''), 5000)
  }

  const handleTestTg = async () => {
    await saveTelegramSettingsDB(tg)   // save current state first before testing
    setTgTesting(true); setTgMsg('')
    try {
      const r = await testTelegram()
      setTgMsg(r.ok ? '✓ ส่งข้อความทดสอบสำเร็จ' : `ผิดพลาด: ${r.description || r.error || 'unknown'}`)
    } catch (e) {
      setTgMsg(`ผิดพลาด: ${e.message}`)
    }
    setTgTesting(false)
  }

  const saveLine = async () => {
    if (!canEdit) {
      toast.error('ไม่มีสิทธิ์ดำเนินการ', 'บัญชีของคุณไม่มีสิทธิ์แก้ไขการตั้งค่าระบบ')
      return
    }
    try {
      await saveLineSettingsDB(line)
      const syncResult = await syncNotificationTechsToRegistry(line.technicians, 'LINE')
      setLineIsOk(true)
      if (syncResult.createdCount > 0) {
        setLineMsg(`บันทึกการตั้งค่า LINE สำเร็จ ✓ (เพิ่มเข้าทะเบียนช่าง ${syncResult.createdCount} ท่าน: ${syncResult.createdNames.join(', ')})`)
        toast.success('บันทึกและซิงค์ทะเบียนช่างสำเร็จ', `เพิ่มช่างใหม่เข้าทะเบียนช่าง: ${syncResult.createdNames.join(', ')}`)
      } else if (syncResult.updatedCount > 0) {
        setLineMsg('บันทึกการตั้งค่า LINE สำเร็จ ✓ (อัปเดตเชื่อมโยงทะเบียนช่างเรียบร้อย)')
      } else {
        setLineMsg('บันทึกการตั้งค่า LINE สำเร็จ ✓')
      }
    } catch (e) {
      setLineIsOk(false)
      setLineMsg(`ผิดพลาด: ${e.message}`)
      toast.error('เกิดข้อผิดพลาดในการบันทึก', e.message)
    }
    setTimeout(() => setLineMsg(''), 5000)
  }

  const handleTestLine = async () => {
    await saveLineSettingsDB(line)
    setLineTesting(true)
    setLineMsg('')
    try {
      const r = await testLineNotification()
      if (r.ok) {
        setLineIsOk(true)
        setLineMsg('✓ ส่งข้อความแจ้งเตือนทดสอบเข้า LINE สำเร็จเรียบร้อย!')
      } else {
        setLineIsOk(false)
        setLineMsg(`ผิดพลาด: ${r.error || 'ไม่สามารถส่งข้อความเข้า LINE ได้'}`)
      }
    } catch (e) {
      setLineIsOk(false)
      setLineMsg(`ผิดพลาด: ${e.message}`)
    }
    setLineTesting(false)
  }

  const handleTestGemini = async () => {
    if (!geminiKey.trim()) {
      toast.warning('กรุณาระบุ Gemini API Key ก่อนทดสอบ')
      return
    }
    setGeminiTesting(true)
    setGeminiStatus(null)
    try {
      const res = await testGeminiConnection(geminiKey, geminiModel)
      const activeModel = res?.modelUsed || geminiModel
      if (res?.modelUsed && res.modelUsed !== geminiModel) {
        setGeminiModel(res.modelUsed)
      }
      setGeminiStatus({ ok: true, text: `เชื่อมต่อสำเร็จ! โมเดล ${activeModel} พร้อมใช้งาน` })
      toast.success('เชื่อมต่อ Google Gemini สำเร็จ', `API Key ใช้งานได้ปกติ (${activeModel})`)
    } catch (err) {
      setGeminiStatus({ ok: false, text: err.message || 'เชื่อมต่อไม่สำเร็จ' })
      toast.error('ทดสอบการเชื่อมต่อไม่สำเร็จ', err.message)
    } finally {
      setGeminiTesting(false)
    }
  }

  const handleSaveGemini = async () => {
    setGeminiSaving(true)
    try {
      await saveGeminiConfig({
        apiKey: geminiKey,
        model: geminiModel,
        isEnabled: Boolean(geminiKey.trim()),
      })
      toast.success('บันทึกการตั้งค่า Gemini AI สำเร็จ', 'ระบบพร้อมสำหรับการค้นหาอะไหล่ด้วยภาพแบบ AI Vision (ความแม่นยำ 98%+)')
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', err.message)
    } finally {
      setGeminiSaving(false)
    }
  }

  const loadLineContactsList = async () => {
    setLineContactLoading(true)
    setLineMsg('')
    try {
      const r = await fetchLineContacts()
      if (r.ok && r.contacts) {
        setLineContacts(r.contacts)
        setLineIsOk(true)
        setLineMsg(r.contacts.length
          ? `✓ พบผู้ใช้ที่ทัก LINE บอท ${r.contacts.length} บัญชี`
          : 'ยังไม่พบบัญชี LINE ใหม่ ให้ช่างหรือหัวหน้าเปิดแชตกับบอทแล้วพิมพ์ข้อความทักทายก่อนครับ')
      } else {
        setLineIsOk(false)
        setLineMsg('ไม่พบรายชื่อในระบบ Webhook')
      }
    } catch (e) {
      setLineIsOk(false)
      setLineMsg(`ผิดพลาด: ${e.message}`)
    }
    setLineContactLoading(false)
  }

  const addLineContact = (role, contact) => {
    let key = 'supervisors'
    let label = 'หัวหน้างาน'
    if (role === 'technician') {
      key = 'technicians'
      label = 'ช่างเทคนิค'
    } else if (role === 'needle_keeper') {
      key = 'needle_keepers'
      label = 'ผู้ดูแลเข็ม'
    }
    setLine((p) => {
      const current = p[key] || []
      if (current.some((item) => item.user_id === contact.user_id)) return p
      return { ...p, [key]: [...current, { name: contact.name, user_id: contact.user_id }] }
    })
    setLineIsOk(true)
    setLineMsg(`เพิ่ม ${contact.name} ใน ${label} เรียบร้อยแล้ว (กดบันทึกการตั้งค่าเพื่อเริ่มใช้งานและซิงค์เข้าทะเบียนช่าง)`)
  }

  const loadTgContacts = async () => {
    setTgContactLoading(true); setTgMsg('')
    try {
      const r = await fetchTelegramContacts(tg.bot_token)
      if (!r.ok) {
        setTgMsg(`ผิดพลาด: ${r.error || 'ไม่สามารถดึงรายชื่อจาก Telegram ได้'}`)
      } else {
        setTgContacts(r.contacts || [])
        setTgMsg((r.contacts || []).length
          ? `พบรายชื่อจาก Telegram ${r.contacts.length} รายการ`
          : 'ยังไม่พบรายชื่อ ให้ผู้ใช้เปิดแชตกับบอทแล้วกด Start หรือส่งข้อความก่อน')
      }
    } catch (e) {
      setTgMsg(`ผิดพลาด: ${e.message}`)
    }
    setTgContactLoading(false)
  }

  const handleVerifyAdminPassword = async (e) => {
    e?.preventDefault()
    setAdminAuthError('')
    if (!adminAuthPwd) {
      setAdminAuthError('กรุณากรอกรหัสผ่านเพื่อดำเนินการ')
      return
    }
    if (adminModalMode !== 'delete') {
      const parseResult = telegramAdminSchema.safeParse({
        name: adminFormName,
        chat_id: adminFormChatId,
      })
      if (!parseResult.success) {
        setAdminAuthError(parseResult.error.issues[0]?.message || 'ข้อมูลแอดมินไม่ถูกต้อง')
        return
      }
    }

    setAdminSubmitting(true)
    try {
      const hash = await hashPassword(adminAuthPwd)
      const { data, error } = await db
        .from('users')
        .select('id, role')
        .eq('id', user?.id)
        .eq('password_hash', hash)
        .maybeSingle()

      if (error || !data) {
        setAdminAuthError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
        setAdminSubmitting(false)
        return
      }

      setAdminStep(2)
    } catch (err) {
      setAdminAuthError(`เกิดข้อผิดพลาดในการตรวจสอบ: ${err.message}`)
    }
    setAdminSubmitting(false)
  }

  const handleConfirmAdminAction = async () => {
    setAdminSubmitting(true)
    try {
      let updatedAdmins = [...(tg.admins || [])]
      let actionDesc = ''

      if (adminModalMode === 'add') {
        updatedAdmins.push({ name: adminFormName.trim(), chat_id: adminFormChatId.trim() })
        actionDesc = `เพิ่มแอดมิน ${adminFormName.trim()}`
      } else if (adminModalMode === 'edit') {
        if (adminModalIndex >= 0 && adminModalIndex < updatedAdmins.length) {
          updatedAdmins[adminModalIndex] = { name: adminFormName.trim(), chat_id: adminFormChatId.trim() }
          actionDesc = `แก้ไขข้อมูลแอดมิน ${adminFormName.trim()}`
        }
      } else if (adminModalMode === 'delete') {
        const removed = updatedAdmins[adminModalIndex]?.name || 'แอดมิน'
        updatedAdmins = updatedAdmins.filter((_, i) => i !== adminModalIndex)
        actionDesc = `ลบแอดมิน ${removed}`
      }

      const newTg = { ...tg, admins: updatedAdmins }
      setTg(newTg)
      await saveTelegramSettingsDB(newTg)

      setAdminModalOpen(false)
      toast.success('บันทึกสำเร็จ', `${actionDesc} เรียบร้อยแล้ว`)
      setTgMsg(`${actionDesc} เรียบร้อยแล้ว ✓`)
    } catch (err) {
      setAdminAuthError(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`)
      toast.error('เกิดข้อผิดพลาด', err.message)
    }
    setAdminSubmitting(false)
  }

  const addTgContact = (role, contact) => {
    if (role === 'admin') {
      setAdminModalMode('add')
      setAdminModalIndex(-1)
      setAdminFormName(contact.name || '')
      setAdminFormChatId(contact.chat_id || '')
      setAdminAuthPwd('')
      setAdminAuthError('')
      setAdminStep(1)
      setAdminModalOpen(true)
      return
    }
    let key = 'supervisors'
    let label = 'หัวหน้างาน'
    if (role === 'technician') {
      key = 'technicians'
      label = 'ช่าง'
    } else if (role === 'needle_keeper') {
      key = 'needle_keepers'
      label = 'ผู้ดูแลเข็ม'
    }
    setTg(p => {
      const current = p[key] || []
      if (current.some(item => item.chat_id === contact.chat_id)) return p
      return { ...p, [key]: [...current, { name: contact.name, chat_id: contact.chat_id }] }
    })
    setTgMsg(`เพิ่ม ${contact.name} ใน ${label} แล้ว (กดบันทึกเพื่อเริ่มใช้งานและซิงค์เข้าทะเบียนช่าง)`)
  }

  const tgIsOk = tgMsg.startsWith('✓') || tgMsg.includes('สำเร็จ') || tgMsg.includes('บันทึกแล้ว') || tgMsg.includes('พบรายชื่อ') || tgMsg.includes('เพิ่ม ')

  return (
    <div className="space-y-6 max-w-2xl">

      {/* DB Info */}
      <SectionCard icon={Database} title={t('set_db_title')}>
        <div className="space-y-0 -mx-6 -mb-6">
          {[
            ['รหัสโปรเจกต์', <code key="pid" style={{background:'var(--bg-thead)',padding:'2px 8px',borderRadius:6,fontSize:11,fontFamily:'monospace'}}>fyulqejkzuhwppstezko</code>],
            ['ภูมิภาค',   'ap-northeast-1 (Tokyo)'],
            ['ฐานข้อมูล', <span key="db" style={{color:'#10b981',fontWeight:600}}>PostgreSQL ✓</span>],
            ['ระบบล็อกอิน', <span key="auth" style={{color:'#10b981',fontWeight:600}}>ล็อกอินกำหนดเอง ✓</span>],
          ].map(([k, v], i, arr) => (
            <div key={k} className="flex items-center justify-between px-6 py-3 text-sm"
              style={{borderBottom: i < arr.length-1 ? '1px solid var(--border-subtle)' : 'none'}}>
              <span style={{color:'var(--text-500)'}}>{k}</span>
              <span style={{color:'var(--text-900)'}}>{v}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Table record counts */}
      <SectionCard icon={Database} title={t('set_tables')}>
        <div className="space-y-0 -mx-6 -mb-6">
          {TABLES.map(([table, label], i) => (
            <div key={table} className="flex items-center justify-between px-6 py-2.5 text-sm"
              style={{borderBottom: i < TABLES.length-1 ? '1px solid var(--border-subtle)' : 'none'}}>
              <span style={{color:'var(--text-700)'}}>{label}</span>
              <div className="flex items-center gap-3">
                <code className="text-xs font-mono" style={{color:'var(--text-400)'}}>{table}</code>
                <span className="font-bold w-8 text-right tabular-nums" style={{color:'var(--text-900)'}}>{counts[table] ?? '...'}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Current user info */}
      <SectionCard icon={User} title={t('set_cur_user')}>
        <div className="space-y-0 -mx-6 -mb-6">
          {[
            ['ชื่อผู้ใช้', user?.username],
            ['ชื่อ-นามสกุล', user?.full_name || '—'],
            ['บทบาท', <span key="role" style={{
              padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.06em',
              background:'rgba(99,102,241,0.12)', color:'#818cf8',
              border:'1px solid rgba(99,102,241,0.2)',
            }}>{user?.role}</span>],
            ['User ID', <code key="uid" style={{background:'var(--bg-thead)',padding:'2px 8px',borderRadius:6,fontSize:10,fontFamily:'monospace',color:'var(--text-400)'}}>{user?.id?.slice(0,18)}…</code>],
            ['เวอร์ชันระบบ', <span key="ver" style={{fontWeight:700,color:'var(--text-900)'}}>{APP_VERSION}</span>],
            ['วันที่เผยแพร่', <span key="bdate" style={{color:'var(--text-500)',fontSize:12}}>{APP_BUILD_DATE}</span>],
          ].map(([k, v], i, arr) => (
            <div key={k} className="flex items-center justify-between px-6 py-3 text-sm"
              style={{borderBottom: i < arr.length-1 ? '1px solid var(--border-subtle)' : 'none'}}>
              <span style={{color:'var(--text-500)'}}>{k}</span>
              <span style={{color:'var(--text-900)'}}>{v}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Telegram / QR settings */}
      <TelegramSettings tg={tg} setTg={setTg} tgContacts={tgContacts} tgContactLoading={tgContactLoading} tgTesting={tgTesting} tgIsOk={tgIsOk} tgMsg={tgMsg} loadTgContacts={loadTgContacts} addTgContact={addTgContact} saveTg={saveTg} handleTestTg={handleTestTg} setAdminModalMode={setAdminModalMode} setAdminModalIndex={setAdminModalIndex} setAdminFormName={setAdminFormName} setAdminFormChatId={setAdminFormChatId} setAdminAuthPwd={setAdminAuthPwd} setAdminAuthError={setAdminAuthError} setAdminStep={setAdminStep} setAdminModalOpen={setAdminModalOpen} />


      {/* LINE Notification Settings */}
      <LineSettings line={line} setLine={setLine} lineContacts={lineContacts} lineContactLoading={lineContactLoading} lineTesting={lineTesting} lineIsOk={lineIsOk} lineMsg={lineMsg} webhookCopied={webhookCopied} setWebhookCopied={setWebhookCopied} showLineToken={showLineToken} setShowLineToken={setShowLineToken} loadLineContactsList={loadLineContactsList} addLineContact={addLineContact} saveLine={saveLine} handleTestLine={handleTestLine} toast={toast} />


      {/* ── GOOGLE GEMINI AI VISION SETTINGS ─────────────────────── */}
      <SectionCard icon={Sparkles} title="ระบบ AI ค้นหาอะไหล่ด้วยภาพ (Google Gemini Vision AI)">
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-sm text-purple-700 dark:text-purple-300">
              <Sparkles size={16} className="text-amber-500" />
              <span>Google Gemini Flash Vision (Free Tier)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              ยกระดับความแม่นยำในการค้นหาอะไหล่จากรูปถ่ายเป็น <b>98%+</b> โดย AI จะวิเคราะห์แยกประเภทและจับคู่กับรายการอะไหล่ในคลังอย่างแม่นยำ ไม่สับสนกับพื้นหลังสีขาว
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                ✓ ฟรี 1,500 ครั้ง/วัน
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700">
                ✓ ไม่ต้องผูกบัตรเครดิต
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline ml-auto"
              >
                <span>ขอรับ API Key ฟรีที่ Google AI Studio</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label text-xs font-bold text-slate-700 dark:text-slate-200">
                Google Gemini API Key
              </label>
              <div className="relative flex items-center">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  className="input font-mono text-xs w-full pr-20"
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value)
                    setGeminiStatus(null)
                  }}
                  placeholder="AIzaSy..."
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey((prev) => !prev)}
                  className="absolute right-2 px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label text-xs font-bold text-slate-700 dark:text-slate-200">
                โมเดล AI (Vision Model)
              </label>
              <select
                className="input text-xs w-full font-mono"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              >
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (แนะนำ - ฟรี 1,500 ครั้ง/วัน ความเร็วสูงสุด ประหยัดโควต้า)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (โมเดลอัจฉริยะสูงสุด)</option>
                <option value="gemini-flash-latest">gemini-flash-latest (เลือกโมเดล Flash ล่าสุดอัตโนมัติ)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash (เสถียรและประมวลผลภาพไว)</option>
              </select>
            </div>

            {geminiStatus && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                geminiStatus.ok
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {geminiStatus.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                <span>{geminiStatus.text}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveGemini}
                disabled={geminiSaving}
                className="btn-primary flex items-center gap-1.5 text-xs font-bold"
              >
                <Save size={14} />
                <span>{geminiSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Gemini'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={geminiTesting || !geminiKey.trim()}
                className="btn-outline flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              >
                <Sparkles size={14} className={geminiTesting ? 'animate-spin' : ''} />
                <span>{geminiTesting ? 'กำลังทดสอบ...' : '⚡ ทดสอบการเชื่อมต่อ'}</span>
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Change password */}
      <SectionCard icon={Shield} title={t('set_change_pwd')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('set_pwd_label')}</label>
              <input className="input" type="password" value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" />
            </div>
            <div>
              <label className="label">ยืนยันรหัสผ่าน</label>
              <input className="input" type="password" value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="พิมพ์รหัสผ่านซ้ำ" />
            </div>
          </div>

          {pwdMsg && (
            <div className="text-sm px-4 py-2.5 rounded-xl" style={{
              color: isOk ? '#10b981' : '#ef4444',
              background: isOk ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isOk ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>{pwdMsg}</div>
          )}

          <button className="btn-primary" onClick={changePassword} disabled={pwdLoading}>
            <Save size={14}/> {pwdLoading ? t('saving') : t('set_pwd_btn')}
          </button>
        </div>
      </SectionCard>

{/* User Manual Documentation Card */}
      <SectionCard icon={BookOpen} title="คู่มือการใช้งานระบบ (User Manual & Documentation)">
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            คู่มือการใช้งานระบบ TextileOps CMMS ฉบับสมบูรณ์ ({APP_VERSION}) ครอบคลุม 14 เมนูหลัก พร้อมภาพประกอบจริงจากระบบ ขั้นตอนการบันทึกงานซ่อม การนับเวลา SLA 12 ชม./วัน และแนวปฏิบัติหน้างาน
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="/manual/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-4 py-2 text-xs flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', textDecoration: 'none', color: '#ffffff' }}
            >
              <BookOpen size={14} />
              <span>เปิดดูคู่มือออนไลน์ (Interactive Web)</span>
              <ExternalLink size={12} />
            </a>
            <a
              href="/manual/TextileOps_CMMS_User_Manual.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs flex items-center gap-2 rounded-xl font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              style={{ textDecoration: 'none' }}
            >
              <Download size={14} />
              <span>ดาวน์โหลดคู่มือ PDF (A4 คมชัด)</span>
            </a>
          </div>
        </div>
      </SectionCard>

      {/* PWA Mobile App Card */}
      <SectionCard icon={Smartphone} title="แอปพลิเคชันมือถือ (PWA Mobile App)">
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            ท่านสามารถติดตั้ง <b>TextileOps CMMS</b> เป็นแอปพลิเคชันลงบนหน้าจอมือถือ (Android / iPhone / iPad) เพื่อเปิดใช้งานแบบเต็มหน้าจอ (Full Screen) รวดเร็ว และรองรับการแจ้งเตือนงานซ่อม
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                localStorage.removeItem('pwa_prompt_dismissed')
                window.location.reload()
              }}
              className="btn-primary px-4 py-2 text-xs flex items-center gap-2"
            >
              <Download size={14} />
              <span>แสดงปุ่มติดตั้งแอปบนมือถือ</span>
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Admin Security Gate Modal (2-Step Confirmation + Password Verification) */}
      {adminModalOpen && (
        <Modal open={adminModalOpen} onClose={() => !adminSubmitting && setAdminModalOpen(false)}>
          <Modal.Header
            title={
              adminModalMode === 'add'
                ? '🛡️ เพิ่มผู้ดูแลระบบ (Admin)'
                : adminModalMode === 'edit'
                ? '✏️ แก้ไขข้อมูลผู้ดูแลระบบ (Admin)'
                : '🗑️ ลบผู้ดูแลระบบ (Admin)'
            }
          />
          <Modal.Body className="space-y-4">
            {adminStep === 1 ? (
              <form onSubmit={handleVerifyAdminPassword} className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Lock size={16} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold">ขั้นตอนที่ 1/2: การยืนยันสิทธิ์ความปลอดภัย</span>
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                      การจัดการรายชื่อผู้ดูแลระบบเป็นสิทธิ์ระดับสูง กรุณากรอกรหัสผ่านของคุณ ({user?.username || 'ผู้ใช้'}) เพื่อดำเนินการ
                    </p>
                  </div>
                </div>

                {adminModalMode !== 'delete' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="label text-xs font-semibold">ชื่อผู้ดูแลระบบ / แอดมิน *</label>
                      <input
                        type="text"
                        className="input text-sm w-full"
                        value={adminFormName}
                        onChange={(e) => setAdminFormName(e.target.value)}
                        placeholder="เช่น กฤษดา (Admin)"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs font-semibold">Telegram Chat ID *</label>
                      <input
                        type="text"
                        className="input font-mono text-xs w-full"
                        value={adminFormChatId}
                        onChange={(e) => setAdminFormChatId(e.target.value)}
                        placeholder="เช่น 6981653027 หรือ -100..."
                        required
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        ตัวเลข Chat ID ส่วนตัว หรือ Group ID ที่ติดลบ (-100...)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                    <span className="font-semibold text-rose-700 dark:text-rose-400">
                      คุณกำลังจะลบแอดมิน:
                    </span>
                    <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">
                      {adminFormName} (Chat ID: {adminFormChatId})
                    </div>
                  </div>
                )}

                <div>
                  <label className="label text-xs font-semibold">รหัสผ่านของคุณ ({user?.username}) *</label>
                  <div className="relative">
                    <input
                      type={showAdminPwd ? 'text' : 'password'}
                      className="input text-sm w-full pr-9"
                      value={adminAuthPwd}
                      onChange={(e) => {
                        setAdminAuthPwd(e.target.value)
                        setAdminAuthError('')
                      }}
                      placeholder="กรอกรหัสผ่านเพื่อยืนยัน"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPwd(!showAdminPwd)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {adminAuthError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{adminAuthError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-outline text-xs px-3 py-1.5"
                    onClick={() => setAdminModalOpen(false)}
                    disabled={adminSubmitting}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                    disabled={adminSubmitting}
                  >
                    {adminSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                    <span>ถัดไป: ตรวจสอบและยืนยันรอบที่ 2 →</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Final Double Confirmation */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <ShieldAlert size={20} />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    ⚠️ ยืนยันการดำเนินการรอบที่ 2 (ขั้นตอนสุดท้าย)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    โปรดตรวจสอบความถูกต้อง ข้อมูลนี้จะมีผลต่อการรับแจ้งเตือนข้อผิดพลาดระบบ (Crash Alerts) ทันที
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">การดำเนินการ:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {adminModalMode === 'add' ? 'เพิ่มผู้ดูแลระบบ' : adminModalMode === 'edit' ? 'แก้ไขผู้ดูแลระบบ' : 'ลบผู้ดูแลระบบ'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ชื่อแอดมิน:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{adminFormName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Telegram Chat ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{adminFormChatId}</span>
                  </div>
                </div>

                {adminAuthError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {adminAuthError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-outline text-xs px-3 py-1.5"
                    onClick={() => setAdminStep(1)}
                    disabled={adminSubmitting}
                  >
                    ← ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    className={adminModalMode === 'delete' ? 'btn-danger text-xs px-4 py-1.5' : 'btn-primary text-xs px-4 py-1.5'}
                    onClick={handleConfirmAdminAction}
                    disabled={adminSubmitting}
                  >
                    {adminSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    <span>ยืนยันและบันทึกข้อมูล ✓</span>
                  </button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      )}

    </div>
  )
}
