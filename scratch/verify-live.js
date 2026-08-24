import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fyulqejkzuhwppstezko.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data } = await supabase
    .from('cylinders')
    .select('id, Serial_NOW, Serial_OLD, NewMC, Comment')
    .not('Comment', 'is', null)
    .neq('Comment', '')
    .limit(10)

  console.log('Sample Updated Cylinders in Supabase:')
  for (const row of data) {
    console.log(`\n[MC: ${row.NewMC}] Serial_NOW: ${row.Serial_NOW} | Serial_OLD: ${row.Serial_OLD}`)
    console.log(`Comment:\n${row.Comment}`)
  }
}

run()
