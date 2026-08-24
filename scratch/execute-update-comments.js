import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://fyulqejkzuhwppstezko.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Reading exact matched preview data...')
  const previewPath = 'C:\\Users\\kitsa\\Documents\\TextileOpsV1\\exact_matched_preview.json'
  const matchedList = JSON.parse(fs.readFileSync(previewPath, 'utf-8'))

  console.log(`Found ${matchedList.length} cylinders to update.`)

  let successCount = 0
  let skippedCount = 0
  let errorCount = 0
  const updatedLogs = []

  for (const item of matchedList) {
    try {
      // 1. Fetch current live cylinder from Supabase
      const { data: currentCyl, error: fetchErr } = await supabase
        .from('cylinders')
        .select('id, Serial_NOW, Serial_OLD, NewMC, Comment')
        .eq('id', item.id)
        .single()

      if (fetchErr || !currentCyl) {
        console.error(`Error fetching cylinder ID ${item.id}:`, fetchErr)
        errorCount++
        continue
      }

      const liveComment = (currentCyl.Comment || '').trim()
      const newNotesText = item.notes.map(n => n.text).join(' | ')

      // Check if already updated
      if (liveComment.includes(item.notes[0].text)) {
        skippedCount++
        continue
      }

      let finalComment = ''
      if (liveComment) {
        finalComment = `${liveComment}\n[Excel Note]: ${newNotesText}`
      } else {
        finalComment = newNotesText
      }

      // 2. Perform safe update
      const { error: updateErr } = await supabase
        .from('cylinders')
        .update({
          Comment: finalComment,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (updateErr) {
        console.error(`Error updating cylinder ID ${item.id} (${item.Serial_NOW}):`, updateErr)
        errorCount++
      } else {
        successCount++
        updatedLogs.push({
          id: item.id,
          mc: item.mc,
          serialNow: item.Serial_NOW,
          serialOld: item.Serial_OLD,
          oldComment: liveComment,
          newComment: finalComment
        })
      }
    } catch (e) {
      console.error(`Unexpected error on ID ${item.id}:`, e)
      errorCount++
    }
  }

  console.log('\n=========================================')
  console.log(`Update Completed!`)
  console.log(`✅ Successfully Updated: ${successCount}`)
  console.log(`⏩ Skipped (Already Up-to-Date): ${skippedCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log('=========================================')

  fs.writeFileSync(
    'C:\\Users\\kitsa\\Documents\\TextileOpsV1\\update_execution_log.json',
    JSON.stringify(updatedLogs, null, 2)
  )
}

run()
