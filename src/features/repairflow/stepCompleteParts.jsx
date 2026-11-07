// Spare-parts picker moved verbatim from StepComplete (props only).
export function StepCompleteParts({ catalogParts, selectedPartId, setSelectedPartId, partQty, setPartQty, selectedPartsList, handleAddCatalogPart, handleRemovePart, customPartsText, setCustomPartsText, inputStyle }) {
  return (
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 14, border: '1.5px solid #cbd5e1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                📦 อะไหล่ที่เบิกใช้ (บันทึกเป็นรายการ ไม่ตัดสต็อก)
              </label>

              {/* 1. Catalog Part Picker */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minHeight: 40, fontSize: 13, padding: '6px 10px' }}
                >
                  <option value="">-- เลือกอะไหล่จากคลัง --</option>
                  {catalogParts.map((p) => {
                    const id = p.id || p._id
                    const stock = Number(p.Stock_Qty ?? p.QuantityOnHand ?? p.Stock ?? 0)
                    const code = p.Part_Code || p.PartNumber || p.Code || ''
                    const name = p.Part_Name_EN || p.Part_Name_TH || p.PartName || p.Name || 'อะไหล่'
                    const loc = p.Location_Store || p.location || ''
                    const locBadge = loc ? ` · คลัง ${loc}` : ''
                    return (
                      <option key={id} value={id}>
                        {name} {code ? `[${code}]` : ''}{locBadge} (คงเหลือ: {stock} {p.Unit || 'ชิ้น'})
                      </option>
                    )
                  })}
                </select>

                <input
                  type="number"
                  min={1}
                  value={partQty}
                  onChange={(e) => setPartQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{ ...inputStyle, width: 70, minHeight: 40, textAlign: 'center', fontSize: 13, padding: '6px 4px' }}
                  title="จำนวนที่เบิกใช้"
                />

                <button
                  type="button"
                  onClick={handleAddCatalogPart}
                  disabled={!selectedPartId}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    background: selectedPartId ? '#2563eb' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 12,
                    border: 'none',
                    cursor: selectedPartId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  + เพิ่ม
                </button>
              </div>

              {/* List of Added Catalog Parts */}
              {selectedPartsList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {selectedPartsList.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      <span>📦 {item.PartName} × {item.qty} {item.Unit}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontWeight: 900,
                          cursor: 'pointer',
                          padding: '0 2px',
                        }}
                        title="ลบรายการ"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 2. Free-text for custom / external parts */}
              <input
                value={customPartsText}
                onChange={(e) => setCustomPartsText(e.target.value)}
                placeholder="ระบุอะไหล่อื่นๆ / วัสดุภายนอกเพิ่มเติม (ถ้ามี)..."
                style={{ ...inputStyle, minHeight: 38, fontSize: 13 }}
              />
            </div>
  )
}
