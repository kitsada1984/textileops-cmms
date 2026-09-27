// src/pages/D1TestPage.jsx
// Sandbox and Parallel Testing Page for Cloudflare D1 + Realtime SSE

import React, { useState, useEffect, useRef } from 'react'
import { 
  Database, RefreshCw, Radio, Zap, CheckCircle2, AlertTriangle, 
  Send, Layers, ArrowLeftRight, Clock, Plus, Trash2, Edit3 
} from 'lucide-react'
import { d1 } from '../api/d1Client'
import { supabase } from '../supabase'
import { getActiveDbProvider, setDbProvider } from '../api/dbClient'

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
      const { data, error } = await d1.from(table).select('*').limit(15)
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

  // 3. Benchmark D1 vs Supabase
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

  // 4. Test Realtime Mutation
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

      {/* Status & Benchmark Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Realtime Status */}
        <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>REALTIME SSE STATUS</span>
            <Radio size={18} style={{ color: realtimeStatus === 'SUBSCRIBED' ? '#10b981' : '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '8px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: realtimeStatus === 'SUBSCRIBED' ? '#10b981' : '#f59e0b',
              boxShadow: realtimeStatus === 'SUBSCRIBED' ? '0 0 8px #10b981' : 'none'
            }} />
            {realtimeStatus === 'SUBSCRIBED' ? 'เชื่อมต่อแล้ว (Connected)' : realtimeStatus}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Server-Sent Events (SSE) Stream จาก Cloudflare Edge
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

          {/* Table View */}
          <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
            {tableData.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                {loading ? 'กำลังดึงข้อมูลจาก Cloudflare D1...' : 'ไม่มีข้อมูลในตารางนี้'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {Object.keys(tableData[0]).slice(0, 6).map(col => (
                      <th key={col} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      {Object.keys(tableData[0]).slice(0, 6).map(col => (
                        <td key={col} style={{ padding: '8px 12px', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', textAlign: 'right' }}>
            แสดงผล {tableData.length} แถวแรกจาก D1
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
            <div key={l.id} style={{ color: l.type === 'error' ? '#f87171' : l.type === 'success' ? '#4ade80' : '#cbd5e1' }}>
              [{l.time}] {l.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
