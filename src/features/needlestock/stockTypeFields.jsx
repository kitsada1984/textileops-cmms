
export function StockTypeFields({ movementType, targetMachine, setTargetMachine, shiftPurpose, setShiftPurpose, sourceFrom, setSourceFrom, adjustReason, setAdjustReason, scrapReason, setScrapReason }) {
  return (
    <>
          {movementType === 'OUT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">เบิกไปใส่เครื่องจักร (Machine ID) *</label>
                <input
                  type="text"
                  value={targetMachine}
                  onChange={(e) => setTargetMachine(e.target.value)}
                  placeholder="พิมพ์หรือเลือกเบอร์เครื่อง"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">กะ / วัตถุประสงค์การเบิก</label>
                <select
                  value={shiftPurpose}
                  onChange={(e) => setShiftPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="กะเช้า (งานประจำ)">กะเช้า (งานประจำ)</option>
                  <option value="กะดึก (งานประจำ)">กะดึก (งานประจำ)</option>
                  <option value="เปลี่ยนรอบผลิต (Order ใหม่)">เปลี่ยนรอบผลิต (Order ใหม่)</option>
                  <option value="เปลี่ยนแทนเข็มชำรุด">เปลี่ยนแทนเข็มชำรุด</option>
                  <option value="ทดสอบเครื่องจักร">ทดสอบเครื่องจักร</option>
                </select>
              </div>
            </div>
          )}

          {movementType === 'IN' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">แหล่งที่มาของเข็มที่รับเข้า *</label>
              <select
                value={sourceFrom}
                onChange={(e) => setSourceFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="สั่งซื้อของใหม่ (PO)">สั่งซื้อของใหม่ (PO)</option>
                <option value="รับคืนจากเครื่องจักร">รับคืนจากเครื่องจักร (ถอดออก)</option>
                <option value="รับจากการคัดเกรด">รับจากการคัดเกรดเสร็จสิ้น</option>
                <option value="โอนย้ายจากคลังกลาง">โอนย้ายจากคลังกลาง</option>
              </select>
            </div>
          )}

          {movementType === 'ADJUST' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">สาเหตุการปรับยอด / ตัดยอด *</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)">ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)</option>
                <option value="ตัดยอดเข็มสูญหาย">ตัดยอดเข็มสูญหาย</option>
                <option value="ปรับปรุงยอดตามรายการบัญชี">ปรับปรุงยอดตามรายการบัญชี</option>
                <option value="แก้ไขยอดที่บันทึกผิดพลาดก่อนหน้า">แก้ไขยอดที่บันทึกผิดพลาดก่อนหน้า</option>
              </select>
            </div>
          )}

          {movementType === 'SCRAP' && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">สาเหตุการตัดทิ้ง / ปลดระวาง *</label>
              <select
                value={scrapReason}
                onChange={(e) => setScrapReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="เข็มหัก (ลิ้นเข็ม/ตัวเข็มหัก)">เข็มหัก (ลิ้นเข็ม/ตัวเข็มหัก)</option>
                <option value="เข็มงอ/บิดตัวผิดรูป">เข็มงอ/บิดตัวผิดรูป</option>
                <option value="สึกหรอเกินเกณฑ์ใช้งาน">สึกหรอเกินเกณฑ์ใช้งาน</option>
                <option value="สนิมเกาะผิวเข็ม">สนิมเกาะผิวเข็ม</option>
                <option value="ตกร่อง/ลิ้นเข็มไม่ดีดกลับ">ตกร่อง/ลิ้นเข็มไม่ดีดกลับ</option>
                <option value="สปริงหลุด/ชำรุด">สปริงหลุด/ชำรุด</option>
              </select>
            </div>
          )}

    </>
  )
}
