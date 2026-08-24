import fs from 'fs'

const data = JSON.parse(fs.readFileSync('C:\\Users\\kitsa\\Documents\\TextileOpsV1\\preview_actionable_comments.json', 'utf-8'))

// Show top 20 interesting items with defects, inverters, dates, or spare notes
const highlighted = data.filter(d => 
  d.newNotes.some(n => 
    n.includes('เสีย') || 
    n.includes('รอย') || 
    n.includes('Inverter') || 
    n.includes('เปลี่ยน') || 
    n.includes('แทน') || 
    n.includes('ผ้าบาง') || 
    n.includes('SINKER') || 
    n.includes('Spare') || 
    n.includes('ไหม้') || 
    n.includes('ช็อต')
  )
)

console.log(`Highlighted items: ${highlighted.length}`)
for (const h of highlighted.slice(0, 15)) {
  console.log(`\n-----------------------------------------`)
  console.log(`MC: ${h.mc} | Serial_NOW: ${h.Serial_NOW} | Serial_OLD: ${h.Serial_OLD}`)
  console.log(`Current Comment in DB: ${h.currentComment}`)
  console.log(`Proposed New Comment:\n${h.proposedComment}`)
}
