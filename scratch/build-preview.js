import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://fyulqejkzuhwppstezko.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: cylinders } = await supabase.from('cylinders').select('*').order('id', { ascending: true })
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

  const results = []

  for (const cyl of cylinders) {
    const sNow = (cyl.Serial_NOW || '').trim()
    const sOld = (cyl.Serial_OLD || '').trim()
    const mc = (cyl.NewMC || cyl.Machine_KI || cyl.OLDMC || '').trim()

    // Find all matching comments for this cylinder
    const matched = []

    for (const r of rows) {
      const rSerial = (r.serial || '').trim()
      const rColVal = (r.colVal || '').trim()
      const rComment = (r.comment || '').trim()
      const rMc = (r.mc || '').trim()

      let isMatch = false
      let matchType = ''

      // Strict Serial Match (Priority 1: Serial_NOW, Priority 2: Serial_OLD, Priority 3: Machine Code)
      if (sNow && (rSerial === sNow || rColVal === sNow || rComment.includes(sNow))) {
        isMatch = true
        matchType = `ตรงกับ ซีเรียลปัจจุบัน (${sNow})`
      } else if (sOld && (rSerial === sOld || rColVal === sOld || rComment.includes(sOld))) {
        isMatch = true
        matchType = `ตรงกับ ซีเรียลเดิม (${sOld})`
      } else if (mc && rMc && mc.replace(/\s+/g, '').toUpperCase() === rMc.replace(/\s+/g, '').toUpperCase()) {
        isMatch = true
        matchType = `ตรงกับ เบอร์เครื่อง (${mc})`
      }

      if (isMatch) {
        // Clean comment text
        let cleanText = rComment.replace(/\s+/g, ' ').trim()
        // Skip trivial comments that just repeat the machine name or serial without useful info
        if (cleanText === mc || cleanText === sNow || cleanText === sOld || cleanText === `SA-${sNow}`) {
          // keep if it has extra notes
          if (!cleanText.includes('เปลี่ยน') && !cleanText.includes('เสีย') && !cleanText.includes('แทน') && !cleanText.includes('รอย') && !cleanText.includes('สายพาน') && !cleanText.includes('Inverter') && !cleanText.includes('GG') && !cleanText.includes('ผ้า')) {
            // skip redundant pure-name comment
            continue
          }
        }

        matched.push({
          matchType,
          sheet: r.sheet,
          cell: r.cell,
          category: r.category,
          text: cleanText
        })
      }
    }

    if (matched.length > 0) {
      // Build merged proposed comment
      const existingComment = (cyl.Comment || '').trim()
      const notesList = [...new Set(matched.map(m => m.text))]
      const newCommentSection = notesList.join(' | ')

      let proposedComment = ''
      if (existingComment) {
        if (!existingComment.includes(notesList[0])) {
          proposedComment = `${existingComment} \n[หมายเหตุ]: ${newCommentSection}`
        } else {
          proposedComment = existingComment
        }
      } else {
        proposedComment = newCommentSection
      }

      results.push({
        id: cyl.id,
        mc: mc || '-',
        Serial_NOW: sNow || '-',
        Serial_OLD: sOld || '-',
        Location: cyl.Location || '-',
        currentComment: existingComment || '(ว่าง)',
        proposedComment,
        newNotes: notesList,
        matchedDetails: matched
      })
    }
  }

  console.log(`Cylinders with useful matched comments: ${results.length}`)
  fs.writeFileSync('C:\\Users\\kitsa\\Documents\\TextileOpsV1\\preview_actionable_comments.json', JSON.stringify(results, null, 2))
}

run()
