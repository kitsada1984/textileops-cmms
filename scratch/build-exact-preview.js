import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://fyulqejkzuhwppstezko.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y'

const supabase = createClient(supabaseUrl, supabaseKey)

function cleanSerial(s) {
  if (!s) return ''
  return String(s).replace(/\([^\)]*\)/g, '').trim().toUpperCase()
}

function cleanMC(m) {
  if (!m) return ''
  return String(m).replace(/[\s\-_]/g, '').toUpperCase()
}

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

  const exactMatches = []

  for (const cyl of cylinders) {
    const sNow = (cyl.Serial_NOW || '').trim()
    const sOld = (cyl.Serial_OLD || '').trim()
    const mc = (cyl.NewMC || cyl.Machine_KI || cyl.OLDMC || '').trim()

    const sNowClean = cleanSerial(sNow)
    const sOldClean = cleanSerial(sOld)
    const mcClean = cleanMC(mc)

    const notes = []

    for (const r of rows) {
      const rSerial = (r.serial || '').trim()
      const rColVal = (r.colVal || '').trim()
      const rMc = (r.mc || '').trim()
      const rComment = (r.comment || '').trim()

      const rSerialClean = cleanSerial(rSerial)
      const rColValClean = cleanSerial(rColVal)
      const rMcClean = cleanMC(rMc)

      let isMatch = false
      let matchType = ''

      // 1. Exact Serial NOW match
      if (sNowClean && (rSerialClean === sNowClean || rColValClean === sNowClean)) {
        isMatch = true
        matchType = `ซีเรียลปัจจุบันตรง (${sNow})`
      }
      // 2. Exact Serial OLD match
      else if (sOldClean && (rSerialClean === sOldClean || rColValClean === sOldClean)) {
        isMatch = true
        matchType = `ซีเรียลเดิมตรง (${sOld})`
      }
      // 3. Exact MC match (only if sheet is machine/inverter/parts related)
      else if (mcClean && rMcClean && mcClean === rMcClean && ['เครื่องGMK. 100 mc', 'อะไหล่เครื่องไม่มี', 'กระบอกspare'].includes(r.sheet)) {
        // Avoid generic match if comment is just machine name
        isMatch = true
        matchType = `เบอร์เครื่องตรง (${mc})`
      }

      if (isMatch) {
        let cleanText = rComment.replace(/\s+/g, ' ').trim()
        // Skip redundant notes that only say the machine name
        if (cleanMC(cleanText) === mcClean || cleanSerial(cleanText) === sNowClean || cleanSerial(cleanText) === sOldClean) {
          continue
        }
        notes.push({
          matchType,
          sheet: r.sheet,
          cell: r.cell,
          category: r.category,
          colName: r.colName,
          text: cleanText
        })
      }
    }

    if (notes.length > 0) {
      // Remove duplicate texts
      const uniqueNotes = []
      const seen = new Set()
      for (const n of notes) {
        if (!seen.has(n.text)) {
          seen.add(n.text)
          uniqueNotes.push(n)
        }
      }

      const existingComment = (cyl.Comment || '').trim()
      const newNotesText = uniqueNotes.map(n => n.text).join(' | ')

      let proposed = ''
      if (existingComment) {
        if (!existingComment.includes(uniqueNotes[0].text)) {
          proposed = `${existingComment}\n[Excel Note]: ${newNotesText}`
        } else {
          proposed = existingComment
        }
      } else {
        proposed = newNotesText
      }

      exactMatches.push({
        id: cyl.id,
        mc: mc || '-',
        Serial_NOW: sNow || '-',
        Serial_OLD: sOld || '-',
        Location: cyl.Location || '-',
        currentComment: existingComment || '(ว่าง)',
        proposedComment: proposed,
        notes: uniqueNotes
      })
    }
  }

  console.log(`Clean Exact Matched Cylinders: ${exactMatches.length}`)
  fs.writeFileSync('C:\\Users\\kitsa\\Documents\\TextileOpsV1\\exact_matched_preview.json', JSON.stringify(exactMatches, null, 2))
}

run()
