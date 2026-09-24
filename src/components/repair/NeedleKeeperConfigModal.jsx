import { useState, useEffect } from 'react'
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
} from '../../utils/line'

export default function NeedleKeeperConfigModal({ isOpen, onClose, onSuccess }) {
  const [activeSubTab, setActiveSubTab] = useState('telegram') // 'telegram' | 'line'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setMsg({ text: '', type: '' })

    Promise.all([loadTelegramSettingsDB(), loadLineSettingsDB()])
      .then(([tg, line]) => {
        setTgBotToken(tg?.bot_token || '')
        setTgKeepers(Array.isArray(tg?.needle_keepers) ? tg.needle_keepers : [])
        setLineKeepers(Array.isArray(line?.needle_keepers) ? line.needle_keepers : [])
        setLineNotifyToken(line?.needle_keeper_notify_token || '')
      })
      .catch((e) => {
        setMsg({ text: 'โหลดการตั้งค่าล้มเหลว: ' + e.message, type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [isOpen])

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

  // Add from LINE Contact
  const handleAddLineContact = (contact) => {
    if (lineKeepers.some((k) => k.user_id === contact.user_id)) return
    setLineKeepers((prev) => [
      ...prev,
      { name: contact.name || 'ผู้ดูแลเข็ม', user_id: String(contact.user_id) },
    ])
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
      const updatedLine = {
        ...currentLine,
        needle_keepers: lineKeepers
          .filter((k) => k.name.trim() || k.user_id.trim())
          .map((k) => ({ name: k.name.trim(), user_id: k.user_id.trim() })),
        needle_keeper_notify_token: lineNotifyToken.trim(),
      }
      await saveLineSettingsDB(updatedLine)

      setMsg({ text: 'บันทึกการตั้งค่าผู้ดูแลเข็มเรียบร้อยแล้ว!', type: 'success' })
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
                ระบุ LINE & Telegram ผู้ดูแลเข็ม (สโตร์เข็ม)
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                ระบบจะส่งการแจ้งเตือนคำขอเบิกเข็ม Spare ไปยังบุคคลหรือกลุ่มนี้โดยตรง
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
            <span>✈️ Telegram ผู้ดูแลเข็ม ({tgKeepers.length})</span>
          </button>
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
            <span>🟢 LINE ผู้ดูแลเข็ม ({lineKeepers.length})</span>
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
              {/* Quick fetch from LINE Webhook */}
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
                      ดึงรายชื่อจาก LINE Webhook
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      ให้ผู้ดูแลเข็มหรือกลุ่มสโตร์ทัก LINE บอทเข้ามา จากนั้นกดดึงรายชื่อ
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadLineContacts}
                    disabled={loadingLineContacts}
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
                    <RefreshCw size={12} style={{ animation: loadingLineContacts ? 'spin 1s linear infinite' : 'none' }} />
                    {loadingLineContacts ? 'กำลังดึง...' : 'ดึงรายชื่อ'}
                  </button>
                </div>

                {lineContacts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {lineContacts.map((c, i) => {
                      const isAdded = lineKeepers.some((k) => k.user_id === c.user_id)
                      return (
                        <div
                          key={i}
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
                            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>User ID: {c.user_id}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddLineContact(c)}
                            disabled={isAdded}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: isAdded ? 'default' : 'pointer',
                              border: '1px solid #86efac',
                              background: isAdded ? '#f1f5f9' : '#dcfce7',
                              color: isAdded ? '#94a3b8' : '#15803d',
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
                    รายชื่อผู้ดูแลเข็ม / สโตร์เข็ม (LINE OA)
                  </label>
                  <button
                    type="button"
                    onClick={() => setLineKeepers((prev) => [...prev, { name: '', user_id: '' }])}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid #bbf7d0',
                      background: '#f0fdf4',
                      color: '#16a34a',
                    }}
                  >
                    + เพิ่มรายชื่อ
                  </button>
                </div>

                {lineKeepers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0', textAlign: 'center' }}>
                    ยังไม่มีรายชื่อผู้ดูแลเข็ม (จะส่งแจ้งเตือนหาหัวหน้างานเป็นค่าเริ่มต้น)
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lineKeepers.map((k, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={k.name}
                          onChange={(e) => {
                            const arr = [...lineKeepers]
                            arr[idx] = { ...arr[idx], name: e.target.value }
                            setLineKeepers(arr)
                          }}
                          placeholder="ชื่อ เช่น สโตร์เข็ม"
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
                          value={k.user_id}
                          onChange={(e) => {
                            const arr = [...lineKeepers]
                            arr[idx] = { ...arr[idx], user_id: e.target.value }
                            setLineKeepers(arr)
                          }}
                          placeholder="User ID เช่น U66f... หรือ Group ID C..."
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
                          onClick={() => setLineKeepers(lineKeepers.filter((_, i) => i !== idx))}
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
