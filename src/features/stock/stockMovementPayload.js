import { toNumber } from '../../utils/inventory'

// Matching + payload shaping moved verbatim from applyMovementToSparePart
// (pure logic only — API calls stay in the component).

export function findExistingSparePart(allParts, partCode, targetLoc) {
  return allParts.find((part) => {
    const codeMatch = String(part.Part_Code || '').trim().toLowerCase() === partCode.toLowerCase()
    if (!codeMatch) return false
    if (!targetLoc) return true
    return String(part.Location_Store || '').trim().toLowerCase() === targetLoc
  }) || allParts.find((part) => String(part.Part_Code || '').trim().toLowerCase() === partCode.toLowerCase())
}

export function buildSparePartPayloadFromMovement(existing, payload, after, getStatus) {
  return existing
    ? {
        ...existing,
        Part_Name_EN: existing.Part_Name_EN || payload.Part_Name_EN || '',
        Category: existing.Category || payload.Category || '',
        Unit: existing.Unit || payload.Unit || '',
        Unit_Price: existing.Unit_Price || toNumber(payload.Unit_Price),
        Location_Store: existing.Location_Store || payload.Location_Store || '',
        Stock_Qty: after,
        Status: getStatus(after, existing.Min_Qty),
      }
    : {
        Part_Code: String(payload.Part_Code || '').trim(),
        Part_Name_TH: '',
        Part_Name_EN: payload.Part_Name_EN || String(payload.Part_Code || '').trim(),
        Category: payload.Category || 'อะไหล่',
        Unit: payload.Unit || '',
        Stock_Qty: after,
        Min_Qty: 0,
        Location_Store: payload.Location_Store || '',
        Supplier: '',
        Unit_Price: toNumber(payload.Unit_Price),
        Compatible_Machines: [],
        Status: getStatus(after, 0),
        Remark: 'สร้างอัตโนมัติจากเมนูเคลื่อนไหวสต๊อก',
      }
}
