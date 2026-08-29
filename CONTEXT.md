# TextileOps CMMS — Project Context & Glossary

เอกสารคู่มือมาตรฐานศัพท์เฉพาะ (Domain Terminology), โครงสร้างระบบ และแนวทางการพัฒนาสำหรับระบบบริหารจัดการงานบำรุงรักษาโรงงานถักผ้า (**TextileOps CMMS - Gemma Knits Co., Ltd.**)

---

## 🏢 1. โครงสร้างธุรกิจและข้อมูลหลัก (Core Domain Entities)

| คำศัพท์ / โมดูล | รหัส / Key | คำอธิบาย |
| :--- | :--- | :--- |
| **เครื่องจักรหลัก** | `Machines` / `Mc` | เครื่องถักผ้าประจำโรงงาน (เช่น LA341M, GK1) มีข้อมูล Gauge, Diameter, Feeder, Serial, สถานะการเดินเครื่อง |
| **กระบอกเข็ม** | `Cylinders` | กระบอกเข็มถักผ้า มี Serial NOW, Serial OLD, สถานะ (STANDARD, SWAPPED, SPARE, REPAIR) |
| **สภาพเข็ม** | `NeedleCondition` | การบันทึกตรวจสภาพความสึกหรอของเข็มในกระบอกถักผ้า มีระดับ: `สึกเล็กน้อย`, `สึกปานกลาง`, `สึกมาก`, `สึกมาก(ควรเปลี่ยน)`, `ระบุเอง` |
| **เช็คศูนย์เข็ม** | `CenterCheck` | การตรวจวัดตั้งศูนย์เข็ม Single Jersey และ Double Jersey ตามมาตรฐาน 10 ข้อ พร้อมค่าก่อนทำ/หลังทำ |
| **แผนบำรุงรักษา** | `PMPlan` | แผนการบำรุงรักษาเชิงป้องกันตามรอบเวลา (30, 60, 90 วัน) หรือรอบการทำงาน (Runtime Cycles) |
| **ใบสั่งงานช่าง** | `WorkOrders` | ใบสั่งงานซ่อมบำรุง (Repair, Design Adjustment, PM) บันทึกช่างผู้รับผิดชอบ, เวลาทำงาน, ค่าใช้จ่าย |
| **อะไหล่ & สต็อก** | `SpareParts` | คลังอะไหล่และอุปกรณ์ มีการคุม Min/Max Stock, การเบิก-รับ-ปรับยอดสต็อก |
| **ใบแจ้งซ่อม** | `RepairRequests` | ใบแจ้งซ่อมเครื่องจักรจากฝ่ายผลิต/โอเปอเรเตอร์ส่งถึงฝ่ายช่าง |
| **ประวัติการทำงาน** | `AuditLogs` | บันทึกประวัติการ เพิ่ม/แก้ไข/ลบ ข้อมูลทั้งหมดในระบบเพื่อความโปร่งใสและตรวจสอบได้ |

---

## 🧩 2. มาตรฐาน 6 เสาหลักของ UI/UX ทุกเมนู (6 Core Pillars)

ทุกเมนูหลักและเมนูย่อยในระบบ TextileOps CMMS ต้องประกอบด้วย 6 ชิ้นส่วนมาตรฐาน:

1. **Top KPI Summary Cards:** การ์ดสถิติสรุปตัวเลขสำคัญ 4 ช่องด้านบนสุด
2. **Action Toolbar:** แถบเครื่องมือค้นหา (Search), ตัวกรองแบบไดนามิก (Multi-Filter/Sort), ปุ่มส่งออกข้อมูล (GoogleSheetSyncButton) และปุ่ม Action หลัก (เพิ่มข้อมูล / สแกน QR)
3. **Data Table & Mobile Responsive View:** ตารางแสดงผลที่รองรับทั้งหน้าจอคอมพิวเตอร์และมือถือ พร้อมปุ่ม Action ประจำแถว (ดูรายละเอียด, ดูรูปพรีวิว, ดู PDF, แก้ไข, ลบ)
4. **Form Modal with Validation:** หน้าต่างฟอร์มบันทึกและแก้ไขข้อมูล พร้อมระบบตัวเลือกแบบ Preset และกล่องพิมพ์ "ระบุเอง" เมื่อเลือก Custom
5. **Detail Drawer:** ลิ้นชักเปิดแสดงข้อมูลเชิงลึกเมื่อผู้ใช้คลิกเลือกแถวข้อมูล
6. **Standard A4 PDF & Print Modal:** หน้าต่างพรีวิวและพิมพ์เอกสารมาตรฐาน A4 พร้อมหัวกระดาษบริษัท Gemma Knits, ตารางข้อมูล, ช่องลายเซ็น 4 ฝ่าย และ QR Code สำหรับสแกนตรวจสอบออนไลน์

---

## 📸 3. มาตรฐานการจัดการรูปถ่ายและไฟล์แนบ (Media Standard)

1. **Auto HEIC-to-JPEG Normalization:** รองรับไฟล์ภาพจาก iPhone / มือถือทุกรุ่น โดยตรวจจับและแปลงไฟล์ `.heic` เป็น `.jpeg` อัตโนมัติด้วย `heic2any` และ `normalizeImageFile`
2. **Client-Side Compression:** บีบอัดภาพไม่เกิน 1920px คุณภาพ 85% เพื่อความรวดเร็วในการเปิดดูและประหยัดพื้นที่จัดเก็บ
3. **Dedicated Google Drive Folder:** อัปโหลดภาพลงโฟลเดอร์แยกตามชื่อเมนู (เช่น `'สภาพเข็ม'`, `'รูปกระบอก'`, `'ประวัติเช็คศูนย์'`) พร้อม Base64 Local Fallback
4. **Standard Preview UI:** ใช้คอมโพเนนต์ `ImageThumbnail`, `ImagePreviewModal` และ `FormPhotoCard` ในการแสดงผลตัวอย่างภาพอย่างถูกต้องทุกจุด

---

## 🚀 4. กระบวนการอัปเดตเวอร์ชันและ Deploy (Release Protocol)

เมื่อมีการพัฒนา แก้ไข หรือเพิ่มเติมฟังก์ชันในระบบ ให้ดำเนินการตามขั้นตอน:

1. **Bump Version (3 จุดพร้อมกัน):**
   - `src/version.js` (`APP_VERSION`)
   - `package.json` (`version`)
   - `public/sw.js` (`CACHE_NAME`)
2. **Build Verification:** รัน `npm run build` เพื่อตรวจสอบว่าไม่มี Syntax Error หรือ Module Missing
3. **Git Commit & Push:** บันทึกการเปลี่ยนแปลงด้วย Semantic Commit Message และ Push ขึ้น GitHub (`origin/master`)
4. **Vercel Production Deploy:** รันคำสั่ง `npx vercel --prod --yes` เพื่อ Deploy ขึ้นระบบจริง (`https://textileops-cmms.vercel.app`)
5. **Verify Live Chunk:** ตรวจสอบว่าหน้าเว็บจริงให้บริการ JavaScript Bundle ล่าสุด
6. **Force Refresh:** ผู้ใช้สามารถกดปุ่มไอคอน `🔄` (ล้างแคช & รีเฟรช) ที่แถบด้านบนขวาของเว็บเพื่อโหลดเวอร์ชันล่าสุดทันที
