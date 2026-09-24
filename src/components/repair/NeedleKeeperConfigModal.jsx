import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Send,
  MessageSquare,
  UserPlus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Lock,
  Check,
} from 'lucide-react'
import {
  loadTelegramSettingsDB,
  saveTelegramSettingsDB,
  fetchTelegramContacts,
} from '../../utils/telegram'
import {
  loadLineSettingsDB,
  saveLineSettingsDB,
  fetchLineContacts,
  testNeedleKeeperLineNotification,
} from '../../utils/line'
import { TechnicianAPI } from '../../api/entities'

export default function NeedleKeeperConfigModal({ isOpen, onClose, onSuccess }) {
  const [activeSubTab, setActiveSubTab] = useState('line') // 'line' | 'telegram'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingLine, setTestingLine] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' }) // 'success' | 'error'

  // Telegram state
  const [tgBotToken, setTgBotToken] = useState('')
  const [tgKeepers, setTgKeepers] = useState([])
  const [tgContacts, setTgContacts] = useState([])
  const [loadingTgContacts, setLoadingTgContacts] = useState(false)

  // LINE state
  const [lineKeepers, setLineKeepers] = useState([])
  const [lineNotifyToken, setLineNotifyToken] = useState('')
  const [lineContacts, setLineContacts] = useState([])
  const [loadingLineContacts, setLoadingLineContacts] = useState(false)
  const [techList, setTechList] = useState([])
  const [customName, setCustomName] = useState('')
  const [customUserId, setCustomUserId] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setMsg({ text: '', type: '' })

    Promise.all([
      loadTelegramSettingsDB(),
      loadLineSettingsDB(),
      fetchLineContacts().catch(() => ({ ok: false, contacts: [] })),
      TechnicianAPI.list().catch(() => []),
    ])
      .then(([tg, line, lineRes, techs]) => {
        setTgBotToken(tg?.bot_token || '')
        setTgKeepers(Array.isArray(tg?.needle_keepers) ? tg.needle_keepers : [])
        setLineKeepers(Array.isArray(line?.needle_keepers) ? line.needle_keepers : [])
        setLineNotifyToken(line?.needle_keeper_notify_token || '')
        if (lineRes?.ok && Array.isArray(lineRes.contacts)) {
          setLineContacts(lineRes.contacts)
        }
        if (Array.isArray(techs)) {
          setTechList(techs.filter((t) => t.Active !== false && t.Active !== 'false'))
        }
      })
      .catch((e) => {
        setMsg({ text: 'โหลดการตั้งค่าล้มเหลว: ' + e.message, type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [isOpen])

  // Unified candidates list from lineContacts + technicians with Line_ID
  const allCandidates = useMemo(() => {
    const list = []
    const seen = new Set()

    // 1. From lineContacts (Webhook)
    for (const c of lineContacts) {
      const uid = String(c.user_id || '').trim()
      if (uid && !seen.has(uid)) {
        seen.add(uid)
        list.push({
          name: c.name || 'ผู้ใช้ LINE',
          user_id: uid,
          source: 'LINE Webhook',
          picture_url: c.picture_url,
        })
      }
    }

    // 2. From techList (Technicians with Line_ID)
    for (const t of techList) {
      const uid = String(t.Line_ID || t.line_id || '').trim()
      if (uid && !seen.has(uid)) {
        seen.add(uid)
        list.push({
          name: t.Name || t.name || 'ช่าง',
          user_id: uid,
          source: 'รายชื่อช่าง',
          role: t.SkillLevel || t.Specialization,
        })
      }
    }

    return list
  }, [lineContacts, techList])

  // Fetch Telegram contacts
  const handleLoadTgContacts = async () => {
    if (!tgBotToken) {
      setMsg({ text: 'กรุณาระบุ Telegram Bot Token ก่อนดึงรายชื่อ', type: 'error' })
      return
    }
    setLoadingTgContacts(true)
    setMsg({ text: '', type: '' })
    try {
      const res = await fetchTelegramContacts(tgBotToken)
      if (res.ok) {
        setTgContacts(res.contacts || [])
        if ((res.contacts || []).length === 0) {
          setMsg({ text: 'ยังไม่พบรายชื่อใน Telegram — ให้ผู้ใช้เปิดแชตกับบอทแล้วกด /start ก่อน', type: 'error' })
        }
      } else {
        setMsg({ text: 'ดึงรายชื่อ Telegram ไม่สำเร็จ: ' + (res.error || 'Unknown error'), type: 'error' })
      }
    } catch (e) {
      setMsg({ text: 'ดึงรายชื่อล้มเหลว: ' + e.message, type: 'error' })
    } finally {
      setLoadingTgContacts(false)
    }
  }

  // Fetch LINE contacts
  const handleLoadLineContacts = async () => {
    setLoadingLineContacts(true)
    setMsg({ text: '', type: '' })
    try {
      const res = await fetchLineContacts()
      if (res.ok) {
        setLineContacts(res.contacts || [])
        if ((res.contacts || []).length === 0) {
          setMsg({ text: 'ยังไม่พบรายชื่อที่ทัก LINE บอทเข้ามา', type: 'error' })
        }
      } else {
        setMsg({ text: 'ดึงรายชื่อ LINE ไม่สำเร็จ', type: 'error' })
      }
    } catch (e) {
      setMsg({ text: 'ดึงรายชื่อล้มเหลว: ' + e.message, type: 'error' })
    } finally {
      setLoadingLineContacts(false)
    }
  }

  // Add from TG Contact
  const handleAddTgContact = (contact) => {
    if (tgKeepers.some((k) => k.chat_id === contact.chat_id)) return
    setTgKeepers((prev) => [
      ...prev,
      { name: contact.name || 'ผู้ดูแลเข็ม', chat_id: String(contact.chat_id) },
    ])
  }

  // Lock a user as needle keeper
  const handleLockNeedleKeeper = (name, userId) => {
    const trimmedId = String(userId || '').trim()
    const trimmedName = String(name || 'คนคัดเข็ม').trim()
    if (!trimmedId) return
    setLineKeepers([{ name: trimmedName, user_id: trimmedId }])
    setMsg({
      text: `🔒 ล็อคคุณ "${trimmedName}" (${trimmedId}) เป็นคนคัดเข็มเรียบร้อย! (กด "บันทึกการตั้งค่า" ด้านล่างเพื่อยืนยัน)`,
      type: 'success',
    })
  }

  // Add custom needle keeper
  const handleAddCustom = () => {
    if (!customUserId.trim()) {
      setMsg({ text: 'กรุณากรอก LINE USER ID (เช่น Uxxxx...)', type: 'error' })
      return
    }
    const name = customName.trim() || 'คนคัดเข็ม'
    handleLockNeedleKeeper(name, customUserId.trim())
    setCustomName('')
    setCustomUserId('')
  }

  // Test send to locked LINE
  const handleTestLine = async (targetUserId) => {
    const uid = targetUserId || lineKeepers[0]?.user_id
    if (!uid) {
      setMsg({ text: 'ยังไม่ได้ระบุหรือล็อค LINE USER ID คนคัดเข็ม', type: 'error' })
      return
    }
    setTestingLine(true)
    setMsg({ text: 'กำลังทดสอบส่งข้อความเด้งเข้า LINE...', type: '' })
    try {
      const res = await testNeedleKeeperLineNotification(uid)
      if (res.ok) {
        setMsg({
          text: `✅ ทดสอบสำเร็จ! ข้อความตัวอย่างถูกส่งเด้งไปที่ LINE ของ User ID: ${uid} เรียบร้อยแล้ว`,
          type: 'success',
        })
      } else {
        setMsg({
          text: `❌ ส่งทดสอบไม่สำเร็จ: ${res.error || 'ตรวจสอบ LINE Channel Access Token'}`,
          type: 'error',
        })
      }
    } catch (e) {
      setMsg({ text: `❌ เกิดข้อผิดพลาดในการทดสอบ: ${e.message}`, type: 'error' })
    } finally {
      setTestingLine(false)
    }
  }

  // Save Settings
  const handleSave = async () => {
    setSaving(true)
    setMsg({ text: '', type: '' })
    try {
      // 1. Update Telegram Settings
      const currentTg = await loadTelegramSettingsDB()
      const updatedTg = {
        ...currentTg,
        bot_token: tgBotToken.trim(),
        needle_keepers: tgKeepers
          .filter((k) => k.name.trim() || k.chat_id.trim())
          .map((k) => ({ name: k.name.trim(), chat_id: k.chat_id.trim() })),
      }
      await saveTelegramSettingsDB(updatedTg)

      // 2. Update LINE Settings
      const currentLine = await loadLineSettingsDB()
      const validKeepers = lineKeepers
        .filter((k) => k.name.trim() || k.user_id.trim())
        .map((k) => ({ name: k.name.trim(), user_id: k.user_id.trim() }))

      const updatedLine = {
        ...currentLine,
        needle_keeper_user_id: validKeepers[0]?.user_id || '',
        needle_keepers: validKeepers,
        needle_keeper_notify_token: lineNotifyToken.trim(),
      }
      await saveLineSettingsDB(updatedLine)

      setMsg({ text: 'บันทึกการตั้งค่าคนคัดเข็มเรียบร้อยแล้ว!', type: 'success' })
      if (onSuccess) onSuccess()
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (e) {
      console.error('Save keeper settings error:', e)
      setMsg({ text: 'เกิดข้อผิดพลาดในการบันทึก: ' + e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          maxWidth: 620,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🪡</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                🎯 ล็อคคนคัดเข็ม (LINE & Telegram ผู้ดูแล/คัดเข็ม)
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                เมื่อช่างสแกนขอเบิกเข็ม Spare ข้อความแจ้งเตือนจะเด้งไปที่ LINE USER ID ของคนคัดเข็มทันที
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              padding: 6,
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switchers */}
        <div
          style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '4px 16px',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('line')}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeSubTab === 'line' ? '2px solid #16a34a' : '2px solid transparent',
              background: 'none',
              color: activeSubTab === 'line' ? '#16a34a' : '#64748b',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <MessageSquare size={15} style={{ color: activeSubTab === 'line' ? '#16a34a' : '#94a3b8' }} />
            <span>🟢 LINE คนคัดเข็ม {lineKeepers.length > 0 ? `(🔒 ${lineKeepers[0].name || 'ล็อคแล้ว'})` : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('telegram')}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeSubTab === 'telegram' ? '2px solid #0284c7' : '2px solid transparent',
              background: 'none',
              color: activeSubTab === 'telegram' ? '#0284c7' : '#64748b',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Send size={15} style={{ color: activeSubTab === 'telegram' ? '#0284c7' : '#94a3b8' }} />
            <span>✈️ Telegram ({tgKeepers.length})</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {msg.text && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: msg.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                color: msg.type === 'success' ? '#15803d' : '#b91c1c',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{msg.text}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>
              กำลังโหลดการตั้งค่า...
            </div>
          ) : activeSubTab === 'telegram' ? (
            /* TELEGRAM TAB CONTENT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Bot token */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  value={tgBotToken}
                  onChange={(e) => setTgBotToken(e.target.value)}
                  placeholder="เช่น 8669676892:AAGBxRg1..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Quick fetch from TG */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      ดึงรายชื่อจาก Telegram Bot อัตโนมัติ
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      ให้ผู้ดูแลเข็มทักบอทหรือส่งข้อความ จากนั้นกดดึงรายชื่อ
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadTgContacts}
                    disabled={loadingTgContacts}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCw size={12} style={{ animation: loadingTgContacts ? 'spin 1s linear infinite' : 'none' }} />
                    {loadingTgContacts ? 'กำลังดึง...' : 'ดึงรายชื่อ'}
                  </button>
                </div>

                {tgContacts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {tgContacts.map((c) => {
                      const isAdded = tgKeepers.some((k) => k.chat_id === c.chat_id)
                      return (
                        <div
                          key={c.chat_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>Chat ID: {c.chat_id}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddTgContact(c)}
                            disabled={isAdded}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: isAdded ? 'default' : 'pointer',
                              border: '1px solid #7dd3fc',
                              background: isAdded ? '#f1f5f9' : '#e0f2fe',
                              color: isAdded ? '#94a3b8' : '#0369a1',
                            }}
                          >
                            {isAdded ? 'เพิ่มแล้ว' : '+ เพิ่มเป็นผู้ดูแลเข็ม'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Keepers list */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    รายชื่อผู้ดูแลเข็ม / สโตร์เข็ม (Telegram)
                  </label>
                  <button
                    type="button"
                    onClick={() => setTgKeepers((prev) => [...prev, { name: '', chat_id: '' }])}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid #bae6fd',
                      background: '#f0f9ff',
                      color: '#0284c7',
                    }}
                  >
                    + เพิ่มรายชื่อ
                  </button>
                </div>

                {tgKeepers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0', textAlign: 'center' }}>
                    ยังไม่มีรายชื่อผู้ดูแลเข็ม (จะส่งแจ้งเตือนหาหัวหน้างานเป็นค่าเริ่มต้น)
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tgKeepers.map((k, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={k.name}
                          onChange={(e) => {
                            const arr = [...tgKeepers]
                            arr[idx] = { ...arr[idx], name: e.target.value }
                            setTgKeepers(arr)
                          }}
                          placeholder="ชื่อ เช่น พี่ตุ๊ก สโตร์"
                          style={{
                            width: 140,
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                          }}
                        />
                        <input
                          type="text"
                          value={k.chat_id}
                          onChange={(e) => {
                            const arr = [...tgKeepers]
                            arr[idx] = { ...arr[idx], chat_id: e.target.value }
                            setTgKeepers(arr)
                          }}
                          placeholder="Chat ID เช่น 6981653027 หรือ -100..."
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                            fontFamily: 'monospace',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setTgKeepers(tgKeepers.filter((_, i) => i !== idx))}
                          style={{
                            padding: '8px',
                            borderRadius: 8,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* LINE TAB CONTENT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Status Card: คนคัดเข็มที่ล็อคไว้ */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: lineKeepers.length > 0 ? '#f0fdf4' : '#fffbeb',
                  border: lineKeepers.length > 0 ? '1.5px solid #86efac' : '1.5px solid #fde68a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: lineKeepers.length > 0 ? '#dcfce7' : '#fef3c7',
                        color: lineKeepers.length > 0 ? '#16a34a' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {lineKeepers.length > 0 ? <Lock size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: lineKeepers.length > 0 ? '#166534' : '#92400e' }}>
                        {lineKeepers.length > 0 ? 'คนคัดเข็มที่ล็อคไว้ในระบบ (รับแจ้งเตือนเบิกเข็ม)' : 'ยังไม่ได้ระบุ/ล็อคคนคัดเข็ม'}
                      </div>
                      <div style={{ fontSize: 11, color: lineKeepers.length > 0 ? '#15803d' : '#b45309', marginTop: 2 }}>
                        {lineKeepers.length > 0
                          ? `เมื่อมีช่างขอเบิกเข็ม Spare ข้อความจะเด้งไปที่ LINE USER ID ของ "${lineKeepers[0].name || 'คนคัดเข็ม'}" โดยตรง`
                          : 'กรุณากด "🔒 ล็อคคนนี้" จากรายชื่อด้านล่าง หรือกรอก User ID ด้านล่าง'}
                      </div>
                    </div>
                  </div>

                  {lineKeepers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleTestLine(lineKeepers[0]?.user_id)}
                      disabled={testingLine}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: '#16a34a',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        border: 'none',
                        cursor: testingLine ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
                      }}
                    >
                      <Send size={12} />
                      {testingLine ? 'กำลังส่งทดสอบ...' : '🧪 ทดสอบส่ง LINE'}
                    </button>
                  )}
                </div>

                {lineKeepers.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#ffffff',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#166534' }}>
                        👤 {lineKeepers[0].name || 'คนคัดเข็ม'}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>
                        LINE USER ID: {lineKeepers[0].user_id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLineKeepers([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ปลดล็อค / เปลี่ยนคน
                    </button>
                  </div>
                )}
              </div>

              {/* Direct manual input / paste */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                  ✏️ กรอกหรือวาง LINE USER ID ของคนคัดเข็มโดยตรง
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="ชื่อคนคัดเข็ม เช่น ช.ต๋อง"
                    style={{
                      width: 140,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                    }}
                  />
                  <input
                    type="text"
                    value={customUserId}
                    onChange={(e) => setCustomUserId(e.target.value)}
                    placeholder="LINE USER ID (ขึ้นต้นด้วย U... เช่น U8ce7b7...)"
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🔒 ล็อคคนนี้
                  </button>
                </div>
              </div>

              {/* Candidates selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      📋 เลือกจากรายชื่อที่ตรวจพบในระบบ ({allCandidates.length} คน)
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      คลิกปุ่ม "🔒 ล็อคคนนี้" เพื่อตั้งเป็นคนคัดเข็มหลักที่จะรับแจ้งเตือนเบิกเข็ม
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadLineContacts}
                    disabled={loadingLineContacts}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCw size={11} style={{ animation: loadingLineContacts ? 'spin 1s linear infinite' : 'none' }} />
                    ดึงรายชื่อเพิ่ม
                  </button>
                </div>

                {allCandidates.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: 12 }}>
                    ยังไม่พบรายชื่อในระบบ — ให้คนคัดเข็มทัก LINE บอทเข้ามา หรือกรอก User ID ด้านบน
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {allCandidates.map((c, i) => {
                      const isLocked = lineKeepers[0]?.user_id === c.user_id
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: 10,
                            background: isLocked ? '#f0fdf4' : '#ffffff',
                            border: isLocked ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {c.picture_url ? (
                              <img
                                src={c.picture_url}
                                alt=""
                                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: '#e0e7ff',
                                  color: '#4f46e5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {c.name.slice(0, 1)}
                              </div>
                            )}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: c.source === 'รายชื่อช่าง' ? '#e0f2fe' : '#f1f5f9',
                                    color: c.source === 'รายชื่อช่าง' ? '#0369a1' : '#475569',
                                  }}
                                >
                                  {c.source} {c.role ? `(${c.role})` : ''}
                                </span>
                              </div>
                              <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                                User ID: {c.user_id}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isLocked ? (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                              >
                                <Check size={12} />
                                <span>ล็อคอยู่</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleLockNeedleKeeper(c.name, c.user_id)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #818cf8',
                                  background: '#eef2ff',
                                  color: '#4338ca',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Lock size={11} />
                                <span>ล็อคคนนี้</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleTestLine(c.user_id)}
                              disabled={testingLine}
                              title="ทดสอบส่ง LINE ไปยังคนนี้"
                              style={{
                                padding: '5px 8px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: testingLine ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ทดสอบ
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Optional LINE Notify Token */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  LINE Notify Token กลุ่มสโตร์เข็ม <span style={{ fontSize: 10, color: '#94a3b8' }}>(ทางเลือก)</span>
                </label>
                <input
                  type="password"
                  value={lineNotifyToken}
                  onChange={(e) => setLineNotifyToken(e.target.value)}
                  placeholder="เช่น Access Token ของกลุ่ม LINE Notify สโตร์เข็ม"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            }}
          >
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
