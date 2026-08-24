import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://fyulqejkzuhwppstezko.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Fetching cylinders from Supabase...')
  const { data: cylinders, error } = await supabase.from('cylinders').select('*')
  if (error) {
    console.error('Error fetching cylinders:', error)
    return
  }
  console.log(`Fetched ${cylinders.length} cylinders.`)

  const { data: machines } = await supabase.from('machines').select('*')
  console.log(`Fetched ${machines?.length || 0} machines.`)

  // Read Markdown report
  const mdPath = 'C:\\Users\\kitsa\\Documents\\TextileOpsV1\\รายงานสรุป_Comment_ทั้งหมด.md'
  const content = fs.readFileSync(mdPath, 'utf-8')

  const lines = content.split('\n')
  const rows = []
  let inMasterList = false

  for (const line of lines) {
    if (line.includes('## 3. รายการ Comment ทั้งหมด 252 จุด (Master List)')) {
      inMasterList = true
      continue
    }
    if (!inMasterList) continue
    if (line.trim().startsWith('|') && !line.includes('ลำดับ') && !line.includes('---')) {
      const cols = line.split('|').map(c => c.trim()).slice(1, -1)
      if (cols.length >= 10) {
        rows.push({
          no: cols[0],
          sheet: cols[1],
          cell: cols[2],
          location: cols[3],
          mc: cols[4],
          serial: cols[5],
          colName: cols[6],
          colVal: cols[7],
          comment: cols[8].replace(/<br>/g, ' \n '),
          category: cols[9],
          author: cols[10] || ''
        })
      }
    }
  }

  console.log(`Parsed ${rows.length} comments from report.`)

  // Match with cylinders
  const matchedCylinders = []

  for (const cyl of cylinders) {
    const sNow = (cyl.Serial_NOW || '').trim()
    const sOld = (cyl.Serial_OLD || '').trim()
    const mc = (cyl.NewMC || cyl.Machine_KI || cyl.OLDMC || '').trim()

    const matchedNotes = []

    for (const r of rows) {
      const rSerial = (r.serial || '').trim()
      const rColVal = (r.colVal || '').trim()
      const rMc = (r.mc || '').trim()

      let isMatch = false
      let matchReason = ''

      // 1. Direct Serial Match
      if (sNow && (rSerial === sNow || rColVal === sNow || r.comment.includes(sNow))) {
        isMatch = true
        matchReason = `Match Serial_NOW: ${sNow}`
      } else if (sOld && (rSerial === sOld || rColVal === sOld || r.comment.includes(sOld))) {
        isMatch = true
        matchReason = `Match Serial_OLD: ${sOld}`
      } else if (mc && rMc && (mc.replace(/\s+/g, '').toUpperCase() === rMc.replace(/\s+/g, '').toUpperCase() || mc.includes(rMc) || rMc.includes(mc))) {
        // Machine Match
        isMatch = true
        matchReason = `Match Machine: ${mc} / ${rMc}`
      }

      if (isMatch) {
        matchedNotes.push({
          sourceSheet: r.sheet,
          sourceCell: r.cell,
          category: r.category,
          colName: r.colName,
          commentText: r.comment,
          matchReason
        })
      }
    }

    if (matchedNotes.length > 0) {
      matchedCylinders.push({
        id: cyl.id,
        Serial_NOW: cyl.Serial_NOW,
        Serial_OLD: cyl.Serial_OLD,
        NewMC: cyl.NewMC,
        OLDMC: cyl.OLDMC,
        Location: cyl.Location,
        currentComment: cyl.Comment || '',
        matchedNotes
      })
    }
  }

  console.log(`\nMatched Cylinders Total: ${matchedCylinders.length}`)
  fs.writeFileSync('C:\\Users\\kitsa\\Documents\\TextileOpsV1\\matched_preview.json', JSON.stringify(matchedCylinders, null, 2))
}

run()
