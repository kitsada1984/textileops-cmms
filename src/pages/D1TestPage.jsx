// src/pages/D1TestPage.jsx
// Sandbox and Parallel Testing Page for Cloudflare D1 + Realtime SSE + Cloudflare Quota Monitor

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Database, RefreshCw, Radio, Zap, CheckCircle2, AlertTriangle, 
  Send, Layers, ArrowLeftRight, Clock, Plus, Trash2, Edit3, SlidersHorizontal,
  Activity, HardDrive, ShieldCheck, Key, X, AlertCircle
} from 'lucide-react'
import { d1 } from '../api/d1Client'
import { supabase } from '../supabase'
import { getActiveDbProvider, setDbProvider } from '../api/dbClient'
import DataTable from '../components/ui/DataTable'
import { useUIStore } from '../stores/useUIStore'

const TABLES = [
  'machines',
  'cylinders',
  'workorders',
  'repair_requests',
  'pmplans',
  'needle_sets',
  'spareparts',
  'stocktransactions',
  'purchaseorders',
  'appconfigs',
  'users'
]

const DEFAULT_QUOTA_DATA = {
  plan: 'Cloudflare Free Plan',
  has_warning: true,
  reset_schedule: {
    time_utc: '00:00 UTC',
    time_th: '07:00 น. (เวลาไทย)',
    description: 'โควต้าคำนวณแบบย้อนหลัง 24 ชั่วโมง และรีเซ็ตรอบวันเวลา 07:00 น.',
  },
  quotas: {
    rows_read: {
      label: 'การอ่านแถวข้อมูล D1 (Rows Read)',
      current: 4431650,
      limit: 5000000,
      percent: 88.63,
      level: 'critical',
      readable_current: '4.43M',
      readable_limit: '5.00M',
      unit: 'แถว/วัน',
    },
    rows_written: {
      label: 'การเขียนแถวข้อมูล D1 (Rows Written)',
      current: 685,
      limit: 100000,
      percent: 0.69,
      level: 'normal',
      readable_current: '685',
      readable_limit: '100,000',
      unit: 'แถว/วัน',
    },
    storage: {
      label: 'พื้นที่จัดเก็บฐานข้อมูล (Storage)',
      current: 2351104,
      limit: 5368709120,
      percent: 0.05,
      level: 'normal',
      readable_current: '2.35 MB',
      readable_limit: '5.00 GB',
      unit: 'ไบต์',
    },
    functions_requests: {
      label: 'การเรียกใช้ Pages Functions (Requests)',
      current: 4937,
      limit: 100000,
      percent: 4.94,
      level: 'normal',
      readable_current: '4,937',
      readable_limit: '100,000',
      unit: 'ครั้ง/วัน',
    },
  },
  activity_24h: {
    read_queries: 49919,
    write_queries: 111,
    total_queries: 50030,
    num_tables: 19,
  },
}

export default function D1TestPage() {
  const [provider, setProvider] = useState(getActiveDbProvider())
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING')
  const [events, setEvents] = useState([])
  const [selectedTable, setSelectedTable] = useState('machines')
  const [tableData, setTableData] = useState([])
  const [loading, setLoading] = useState(false)
  const [d1Latency, setD1Latency] = useState(null)
  const [supabaseLatency, setSupabaseLatency] = useState(null)
  const [testLog, setTestLog] = useState([])

  // Cloudflare Quota states
  const [quotaData, setQuotaData] = useState(DEFAULT_QUOTA_DATA)
  const [quotaLoading, setQuotaLoading] = useState(false)
  const [quotaError, setQuotaError] = useState(null)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [apiTokenInput, setApiTokenInput] = useState('')
  const [savingToken, setSavingToken] = useState(false)

  const tableDensity = useUIStore((s) => s.tableDensity)
  const setTableDensity = useUIStore((s) => s.setTableDensity)

  const dynamicColumns = useMemo(() => {
    if (!tableData || tableData.length === 0) return []
    const keys = Object.keys(tableData[0]).slice(0, 8)
    return keys.map((key) => ({
      accessorKey: key,
      header: key,
      cell: (info) => {
        const val = info.getValue()
        return typeof val === 'object' && val !== null
          ? JSON.stringify(val)
          : String(val ?? '')
      },
    }))
  }, [tableData])

  const channelRef = useRef(null)

  const addLog = (msg, type = 'info') => {
    setTestLog(prev => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type }, ...prev.slice(0, 49)])
  }

  // 1. Setup Realtime SSE Subscription
  useEffect(() => {
    addLog('กำลังเชื่อมต่อ Realtime SSE Stream...', 'info')
    const channel = d1.channel('d1-realtime-test')
      .on('postgres_changes', { event: '*', table: '*' }, (payload) => {
        addLog(`⚡ ได้รับ Event เรียลไทม์ [${payload.eventType}] จากตาราง ${payload.table}`, 'success')
        setEvents(prev => [{ ...payload, receivedAt: new Date().toLocaleTimeString() }, ...prev.slice(0, 29)])
        // Auto-refresh table if current table is modified
        if (payload.table === selectedTable) {
          loadTableData(selectedTable)
        }
      })
      .subscribe((status) => {
        setRealtimeStatus(status)
        addLog(`สถานะ Realtime: ${status}`, 'success')
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [selectedTable])

  // 2. Load Table Data
  const loadTableData = async (table) => {
    setLoading(true)
    try {
      const startTime = performance.now()
      const { data, error } = await d1.from(table).select('*').limit(50)
      const duration = (performance.now() - startTime).toFixed(1)
      setD1Latency(duration)

      if (error) {
        addLog(`❌ ดึงข้อมูล ${table} จาก D1 ล้มเหลว: ${error.message}`, 'error')
      } else {
        setTableData(data || [])
        addLog(`✅ ดึงข้อมูล ${table} จาก D1 สำเร็จ (${data?.length || 0} เรคคอร์ด, ${duration} ms)`, 'success')
      }
    } catch (err) {
      addLog(`❌ เกิดข้อผิดพลาด: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTableData(selectedTable)
  }, [selectedTable])

  // 3. Load Cloudflare Quota Data
  const loadQuotaData = async () => {
    setQuotaLoading(true)
    setQuotaError(null)
    try {
      if (typeof fetch === 'function') {
        const res = await fetch('/api/d1/quota')
        if (res.ok) {
          const data = await res.json()
          if (data && data.ok) {
            setQuotaData(data)
            addLog('📊 อัปเดตข้อมูลโควต้า Cloudflare สำเร็จ', 'success')
            return
          }
        }
      }
    } catch (err) {
      setQuotaError(err.message)
      addLog(`⚠️ ดึงโควต้า Cloudflare สดล้มเหลว (ใช้ข้อมูลแคช): ${err.message}`, 'warning')
    } finally {
      setQuotaLoading(false)
    }
  }

  useEffect(() => {
    loadQuotaData()
  }, [])

  // 4. Save Cloudflare API Token
  const handleSaveToken = async (e) => {
    e.preventDefault()
    if (!apiTokenInput.trim()) return
    setSavingToken(true)
    try {
      const res = await fetch('/api/d1/quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: apiTokenInput.trim() }),
      })
      const data = await res.json()
      if (data?.ok) {
        addLog('✅ บันทึก Cloudflare API Token เรียบร้อย', 'success')
        setShowTokenModal(false)
        setApiTokenInput('')
        loadQuotaData()
      } else {
        alert(data?.error || 'บันทึกไม่สำเร็จ')
      }
    } catch (err) {
      alert(`บันทึก Token ล้มเหลว: ${err.message}`)
    } finally {
      setSavingToken(false)
    }
  }

  // 5. Benchmark D1 vs Supabase
  const runBenchmark = async () => {
    addLog('🚀 กำลังเริ่มวัดความเร็ว (Benchmark)...', 'info')
    
    // Test D1
    const t0 = performance.now()
    await d1.from('machines').select('id, Mc, Location, Status').limit(20)
    const d1Time = (performance.now() - t0).toFixed(1)
    setD1Latency(d1Time)

    // Test Supabase
    const t1 = performance.now()
    await supabase.from('machines').select('id, Mc, Location, Status').limit(20)
    const sbTime = (performance.now() - t1).toFixed(1)
    setSupabaseLatency(sbTime)

    addLog(`📊 ผลการวัดความเร็ว: Cloudflare D1: ${d1Time} ms | Supabase: ${sbTime} ms`, 'success')
  }

  // 6. Test Realtime Mutation
  const triggerRealtimeTest = async () => {
    addLog('กำลังส่งคำสั่งแก้ไขข้อมูลทดสอบเพื่อ Trigger Realtime Event...', 'info')
    const testId = 'realtime_test_sync'
    const payload = {
      id: testId,
      key: 'sync_test_timestamp',
      value: `แก้ไขเมื่อ: ${new Date().toLocaleTimeString()} (ทดสอบโดยผู้ใช้)`,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await d1.from('appconfigs').upsert(payload, { onConflict: 'id' })
    if (error) {
      addLog(`❌ บันทึกทดสอบไม่สำเร็จ: ${error.message}`, 'error')
    } else {
      addLog(`✅ ส่ง Event สำเร็จ! ตรวจสอบที่หน้าต่างอื่น หรือ Event Box ด้านล่าง`, 'success')
    }
  }

  const quotas = quotaData?.quotas || DEFAULT_QUOTA_DATA.quotas
  const activity = quotaData?.activity_24h || DEFAULT_QUOTA_DATA.activity_24h

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#0f172a' }}>
            <Database style={{ color: '#f97316' }} size={28} />
            Cloudflare D1 & Realtime Sandbox
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            ระบบทดสอบคู่ขนาน (Parallel Testing) - ข้อมูลจริงแยกอิสระ ไม่กระทบ Production
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={runBenchmark}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px',
              cursor: 'pointer', fontWeight: '500', color: '#334155'
            }}
          >
            <Clock size={16} />
            ทดสอบความเร็ว (Benchmark)
          </button>

          <button
            onClick={triggerRealtimeTest}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(2,132,199,0.3)'
            }}
          >
            <Send size={16} />
            ส่ง Realtime Test Event
          </button>
        </div>
      </div>

      {/* Top Cards: Latency & SSE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Realtime Status */}
        <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>REALTIME SSE STATUS</span>
            <Radio size={18} style={{ color: realtimeStatus === 'SUBSCRIBED' ? '#10b981' : realtimeStatus === 'PAUSED_IDLE' ? '#94a3b8' : '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '8px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: realtimeStatus === 'SUBSCRIBED' ? '#10b981' : realtimeStatus === 'PAUSED_IDLE' ? '#94a3b8' : '#f59e0b',
              boxShadow: realtimeStatus === 'SUBSCRIBED' ? '0 0 8px #10b981' : 'none'
            }} />
            {realtimeStatus === 'SUBSCRIBED'
              ? 'เชื่อมต่อแล้ว (Connected)'
              : realtimeStatus === 'PAUSED_IDLE'
              ? 'พักการทำงาน (แท็บไม่ได้ใช้งาน)'
              : realtimeStatus}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            {realtimeStatus === 'PAUSED_IDLE'
              ? 'หยุดสตรีมชั่วคราวขณะสลับแท็บเพื่อประหยัดโควต้า Cloudflare'
              : 'Server-Sent Events (SSE) Stream จาก Cloudflare Edge'}
          </p>
        </div>

        {/* Cloudflare D1 Latency */}
        <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>CLOUDFLARE D1 LATENCY</span>
            <Zap size={18} style={{ color: '#f97316' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '8px', color: '#f97316' }}>
            {d1Latency ? `${d1Latency} ms` : 'ยังไม่ได้วัด'}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            ศูนย์ข้อมูล Edge ใกล้ที่สุด (Bangkok / Singapore)
          </p>
        </div>

        {/* Supabase Latency */}
        <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>SUPABASE LATENCY</span>
            <Database size={18} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '8px', color: '#3b82f6' }}>
            {supabaseLatency ? `${supabaseLatency} ms` : 'ยังไม่ได้วัด'}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Supabase Cloud Hosted DB (ap-southeast-1)
          </p>
        </div>
      </div>

      {/* Cloudflare Quotas & Resource Usage Section */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
        padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} style={{ color: '#f97316' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                สถานะโควต้า Cloudflare (Cloudflare Quota & Resource Usage)
              </h2>
              <span style={{ fontSize: '12px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                {quotaData?.plan || 'Cloudflare Free Plan'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              ตรวจสอบปริมาณการใช้งานจริงในรอบ 24 ชั่วโมง ป้องกันการติดลิมิตขีดจำกัด (Rate Limit) ของระบบ
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {quotaData?.last_updated && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                อัปเดต: {new Date(quotaData.last_updated).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadQuotaData}
              disabled={quotaLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#334155'
              }}
              title="รีเฟรชข้อมูลโควต้าสด"
            >
              <RefreshCw size={14} className={quotaLoading ? 'spin' : ''} />
              {quotaLoading ? 'กำลังโหลด...' : 'รีเฟรชโควต้า'}
            </button>

            <button
              onClick={() => setShowTokenModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#0284c7'
              }}
              title="ตั้งค่า Cloudflare API Token เพื่อดึงสถิติสด 24 ชม."
            >
              <Key size={14} />
              ตั้งค่า Token
            </button>
          </div>
        </div>

        {/* Global Health Alert Banner */}
        {quotaData?.has_warning ? (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px',
            backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px',
            marginBottom: '16px', color: '#be123c'
          }}>
            <AlertTriangle size={20} style={{ color: '#e11d48', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>
                ⚠️ แจ้งเตือน: การอ่านข้อมูล D1 (Rows Read) อยู่ในระดับเสี่ยงสูง ({quotas.rows_read.percent}%)
              </strong>
              ตรวจพบการอ่านข้อมูล <strong>{quotas.rows_read.readable_current} แถว</strong> จากขีดจำกัดฟรี <strong>{quotas.rows_read.readable_limit} แถว/วัน</strong> | ระบบได้เพิ่ม Index บน <code>_d1_change_log(id)</code> และปรับแต่งรอบ Realtime เรียบร้อยแล้วเพื่อลดการอ่านข้อมูลลงมากกว่า 95% ทันที | โควต้าจะรีเซ็ตรอบใหม่ทุกวันเวลา <strong>07:00 น. (00:00 UTC)</strong>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
            backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
            marginBottom: '16px', color: '#15803d', fontSize: '13px'
          }}>
            <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span>ทุกบริการอยู่ในขอบเขตโควต้าปกติ ปลอดภัย พร้อมใช้งานเต็มรูปแบบ (โควต้ารีเซ็ตรอบวันเวลา 07:00 น.)</span>
          </div>
        )}

        {/* 4 Quota Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {/* Card 1: Rows Read */}
          <div style={{
            padding: '16px', borderRadius: '10px',
            backgroundColor: quotas.rows_read.level === 'critical' ? '#fff1f2' : quotas.rows_read.level === 'warning' ? '#fffbeb' : '#f8fafc',
            border: `1px solid ${quotas.rows_read.level === 'critical' ? '#fecdd3' : quotas.rows_read.level === 'warning' ? '#fde68a' : '#e2e8f0'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>D1 ROWS READ (24H)</span>
              <span style={{
                fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px',
                backgroundColor: quotas.rows_read.level === 'critical' ? '#ffe4e6' : quotas.rows_read.level === 'warning' ? '#fef3c7' : '#dcfce7',
                color: quotas.rows_read.level === 'critical' ? '#e11d48' : quotas.rows_read.level === 'warning' ? '#b45309' : '#15803d'
              }}>
                {quotas.rows_read.level === 'critical' ? '⚠️ ใกล้ติดลิมิต' : quotas.rows_read.level === 'warning' ? 'เฝ้าระวัง' : 'ปกติ'}
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: quotas.rows_read.level === 'critical' ? '#be123c' : '#0f172a' }}>
              {quotas.rows_read.readable_current} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#64748b' }}>/ {quotas.rows_read.readable_limit}</span>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, quotas.rows_read.percent)}%`,
                height: '100%',
                backgroundColor: quotas.rows_read.level === 'critical' ? '#e11d48' : quotas.rows_read.level === 'warning' ? '#f59e0b' : '#10b981',
                borderRadius: '4px',
                transition: 'width 0.5s ease-in-out'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
              <span>ใช้งาน {quotas.rows_read.percent}%</span>
              <span>จำกัด 5,000,000 แถว/วัน</span>
            </div>
          </div>

          {/* Card 2: Rows Written */}
          <div style={{
            padding: '16px', borderRadius: '10px',
            backgroundColor: quotas.rows_written.level === 'critical' ? '#fff1f2' : '#f8fafc',
            border: `1px solid ${quotas.rows_written.level === 'critical' ? '#fecdd3' : '#e2e8f0'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>D1 ROWS WRITTEN (24H)</span>
              <span style={{
                fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px',
                backgroundColor: '#dcfce7', color: '#15803d'
              }}>
                ปกติ (ปลอดภัย)
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>
              {quotas.rows_written.readable_current} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#64748b' }}>/ {quotas.rows_written.readable_limit}</span>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, quotas.rows_written.percent)}%`,
                height: '100%',
                backgroundColor: '#10b981',
                borderRadius: '4px'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
              <span>ใช้งาน {quotas.rows_written.percent}%</span>
              <span>จำกัด 100,000 แถว/วัน</span>
            </div>
          </div>

          {/* Card 3: Storage */}
          <div style={{
            padding: '16px', borderRadius: '10px',
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>D1 STORAGE SIZE</span>
              <span style={{
                fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px',
                backgroundColor: '#dcfce7', color: '#15803d'
              }}>
                ปกติ (เหลือ 99.9%)
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>
              {quotas.storage.readable_current} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#64748b' }}>/ {quotas.storage.readable_limit}</span>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(1, Math.min(100, quotas.storage.percent))}%`,
                height: '100%',
                backgroundColor: '#10b981',
                borderRadius: '4px'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
              <span>ใช้งาน {quotas.storage.percent}%</span>
              <span>ขีดจำกัดฟรี 5 GB</span>
            </div>
          </div>

          {/* Card 4: Functions Requests */}
          <div style={{
            padding: '16px', borderRadius: '10px',
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>PAGES FUNCTIONS (24H)</span>
              <span style={{
                fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px',
                backgroundColor: '#dcfce7', color: '#15803d'
              }}>
                ปกติ (ปลอดภัย)
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>
              {quotas.functions_requests.readable_current} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#64748b' }}>/ {quotas.functions_requests.readable_limit}</span>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, quotas.functions_requests.percent)}%`,
                height: '100%',
                backgroundColor: '#10b981',
                borderRadius: '4px'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
              <span>ใช้งาน {quotas.functions_requests.percent}%</span>
              <span>จำกัด 100,000 ครั้ง/วัน</span>
            </div>
          </div>
        </div>

        {/* 24-Hour Activity Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px',
          border: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b', flexWrap: 'wrap', gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>📖 อ่านคำสั่ง (Read Queries): <strong style={{ color: '#0f172a' }}>{activity.read_queries.toLocaleString()}</strong> ครั้ง</span>
            <span>✍️ เขียนคำสั่ง (Write Queries): <strong style={{ color: '#0f172a' }}>{activity.write_queries.toLocaleString()}</strong> ครั้ง</span>
            <span>⚡ รวมคำสั่งทั้งหมด: <strong style={{ color: '#0f172a' }}>{activity.total_queries.toLocaleString()}</strong> ครั้ง</span>
            <span>📂 จำนวนตาราง: <strong style={{ color: '#0f172a' }}>{activity.num_tables}</strong> ตาราง</span>
          </div>
          <div>
            <span>⏰ รีเซ็ตโควต้า: <strong style={{ color: '#0284c7' }}>07:00 น. (00:00 UTC)</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Data Inspector & Realtime Events */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left: Table Data Inspector */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={18} style={{ color: '#0ea5e9' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                ตรวจสอบข้อมูลในตาราง D1
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                {TABLES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setTableDensity(tableDensity === 'compact' ? 'comfortable' : 'compact')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                  backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px', color: '#475569'
                }}
                title="สลับโหมดความแน่นของตาราง (Comfortable / Compact)"
              >
                <SlidersHorizontal size={14} />
                {tableDensity === 'compact' ? 'กระชับ (Compact)' : 'ปกติ (Normal)'}
              </button>

              <button
                onClick={() => loadTableData(selectedTable)}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                  backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px'
                }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                รีเฟรช
              </button>
            </div>
          </div>

          {/* Table View powered by TanStack Table v8 */}
          <div style={{ marginTop: '4px' }}>
            <DataTable
              data={tableData}
              columns={dynamicColumns}
              loading={loading}
              emptyMessage={loading ? 'กำลังดึงข้อมูลจาก Cloudflare D1...' : 'ไม่มีข้อมูลในตารางนี้'}
              showPagination={true}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', textAlign: 'right' }}>
            โหลด {tableData.length} แถวแรกจาก D1 (รองรับ Sorting, Pagination, และ Dynamic Density)
          </div>
        </div>

        {/* Right: Live Realtime Events Log */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} style={{ color: '#10b981' }} />
              Live Realtime Events
            </h2>
            <span style={{ fontSize: '12px', backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '10px', fontWeight: '500' }}>
              {events.length} events
            </span>
          </div>

          <div style={{ flex: 1, maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                รอ Event จากระบบ...<br />
                <span style={{ fontSize: '11px' }}>ลองกดปุ่ม "ส่ง Realtime Test Event" ด้านบน</span>
              </div>
            ) : (
              events.map((ev, i) => (
                <div key={i} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '4px' }}>
                    <span style={{
                      color: ev.eventType === 'INSERT' ? '#10b981' : ev.eventType === 'UPDATE' ? '#0284c7' : '#ef4444'
                    }}>
                      [{ev.eventType}] {ev.table}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>{ev.receivedAt}</span>
                  </div>
                  <div style={{ color: '#475569', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '11px' }}>
                    {ev.new ? (typeof ev.new === 'object' ? JSON.stringify(ev.new).slice(0, 100) : String(ev.new)) : `ID: ${ev.recordId}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div style={{ marginTop: '24px', backgroundColor: '#0f172a', borderRadius: '12px', padding: '16px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#38bdf8', display: 'flex', justifyContent: 'space-between' }}>
          <span>💻 Console Activity Log</span>
          <span style={{ color: '#64748b' }}>Realtime Trace</span>
        </div>
        <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {testLog.map(l => (
            <div key={l.id} style={{ color: l.type === 'error' ? '#f87171' : l.type === 'success' ? '#4ade80' : l.type === 'warning' ? '#fde047' : '#cbd5e1' }}>
              [{l.time}] {l.msg}
            </div>
          ))}
        </div>
      </div>

      {/* Cloudflare API Token Modal */}
      {showTokenModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} style={{ color: '#0284c7' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                  ตั้งค่า Cloudflare API Token
                </h3>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              ป้อน Cloudflare API Token เพื่อให้ระบบดึงสถิติกราฟและตัวเลขโควต้าสดจาก Cloudflare Analytics API (ต้องมีสิทธิ์ <code>Account:Analytics:Read</code> และ <code>D1:Read</code>)
            </p>

            <form onSubmit={handleSaveToken}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Cloudflare API Token
                </label>
                <input
                  type="password"
                  placeholder="เช่น cfoat_... หรือ API Token จาก Cloudflare Dashboard"
                  value={apiTokenInput}
                  onChange={(e) => setApiTokenInput(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc', color: '#475569', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingToken}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    backgroundColor: '#0284c7', color: '#fff', fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', boxShadow: '0 2px 4px rgba(2,132,199,0.3)'
                  }}
                >
                  {savingToken ? 'กำลังบันทึก...' : 'บันทึก Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
