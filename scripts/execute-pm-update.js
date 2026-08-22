import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fyulqejkzuhwppstezko.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y'

const supabase = createClient(supabaseUrl, supabaseKey)

const rawInput = `
M/C No.=CV301-M, วันที่=2016-10-09, รายการซ่อม=ประกอบเครื่อง
M/C No.=DA-301M, วันที่=2026-04-28, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่ ใช้เข็มเครื่อง DA344W, เข็ม2ขา G0028-G0029 สึกปานกลาง, ตุ๊ก
M/C No.=DA-302M, วันที่=2026-06-16, รายการซ่อม=เพิ่มเข็ม ขา1 เดิน4ขา, ใช้เข็ม 4 ขา สึกปานกลาง, ตุ๊ก
M/C No.=DA-303M, วันที่=2026-08-06, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ ใช้เข็มชุดเดิมสึกเล็กน้อย, ใช้เข็ม 4 ขาสึกเล็กน้อย
M/C No.=DA-305M, วันที่=2026-02-09, รายการซ่อม=เปลี่ยนเข็ม cy ใช้เข็ม 4ขา, เข็ม  CY 4ขา  สึกปานกลาง, ตุ๊ก
M/C No.=DA-306M, วันที่=2026-05-22, รายการซ่อม=เปลี่ยนกระบอกเข็มจากDB-304Mเป็นDA-306M, ใช้เข็ม4ขา เข็มเครื่องDA-301M  สึกปานกลาง, ตุ๊ก
M/C No.=DA-307P, วันที่=2026-06-05, รายการซ่อม=ล้างเครื่อง  คัดเข็ม, เข็มcy-Di สึกปานกลาง, ผ้าอืด
M/C No.=DA-308W, วันที่=2025-09-13, รายการซ่อม=ล้างเครื่องเปลี่ยนใช้เข็มชุด 2 ขา, ใช้เข็ม2ขาG005-G0027 สึกปานกลาง, ตุ๊ก
M/C No.=DA-342M, วันที่=2026-06-01, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ ใช้เข็มชุดใหม่ จาก DA-344W, ใช้เข็ม2ขาG002,G005   ใช้เข็มขาตรงสึกปานกลาง, ตุ๊ก
M/C No.=DA-343M, วันที่=2026-06-28, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่  ใช้เข็มเครื่องDA-346W, ใช้เข็ม2ขา G005-G0027 สึกปานกลาง
M/C No.=DA-345M, วันที่=2026-06-11, รายการซ่อม=ล้างเครื่องเปลี่ยนกระบอก DB-348M เป็น DA-345M, เข็ม4ขา สึกปานกลางใช้เข็มDA-343M, ตุ๊ก
M/C No.=DA-346W, วันที่=2026-05-07, รายการซ่อม=ล้างเครื่อง เช็คศูนย์เปลี่ยนเข็มชุดใหม่ ใช้เข็มเครื่อง DA345M, เข็ม4ขา สึกปานกลาง, ตุ๊ก
M/C No.=DB-3010W, วันที่=4ส.ค26, รายการซ่อม=ล้างเครื่อง เปลี่ยนเข็มชุดใหม่ ใช้เข็มจากเครื่อง DB-304M, ใช้เข็ม4ขา สึกปานกลาง, เข็มเสียบ่อย, ตุ๊ก
M/C No.=DB-3011W, วันที่=2026-05-15, รายการซ่อม=ล้างเครื่องเช็คศูนย์  เปลี่ยนเข็มชุดใหม่ใช้เข็มเครื่อง  DB306M, ใช้เข็ม2ขา G006-G007  CY-สึกปานกลาง, ตุ๊ก
M/C No.=DB-3012W, วันที่=2025-10-06, รายการซ่อม=ล้างเครื่อง  เช็คศูนย์ เปลี่ยนเข็มชุดใหม่ใช้เข็มDB-3011W, ใช้เข็ม2ขา G004-G005 สึกปานกลาง-มาก, ตุ๊ก
M/C No.=DB-3013M, วันที่=2025-05-17, รายการซ่อม=ล้างเครื่อง คัดเข็ม, ใช้เข็ม2ขา  G006-G007  สึกเล็กน้อย, ตุ๊ก
M/C No.=DB-3014M, วันที่=2025-10-22, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, ใช้เข็ม4ขา Dial สึกเล็กน้อย  Cy สึกปานกลาง, ตุ๊ก
M/C No.=DB-3015, วันที่=2025-03-13, รายการซ่อม=ประกอบเครื่อง
M/C No.=DB-302M, วันที่=2026-03-10, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่, ใช้เข็มเครื้อง DB305M 2ขา G004-G006สึกปานกลาง, แก้เข็มสะกิด, ตุ๊ก
M/C No.=DB-305M, วันที่=2026-08-05, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มใหม่, ใช้เข็ม 4 ขา, ตุ๊ก
M/C No.=DB-306M, วันที่=2026-05-08, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ ใช้เข็มชุดใหม่ ใช้เข็มDB-301M, เข็ม2ขาG004-G005 สึกเล็กน้อย, ตุ๊ก
M/C No.=DB-307M, วันที่=2025-04-19, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่ใช้เข็มเครื่องDB3010W, ใช้เข็ม4ขา   Cy สึกปานกลาง-มาก   Dial สึกปานกลาง, ตุ๊ก
M/C No.=DB-308T, วันที่=20, รายการซ่อม=โยกเปลี่ยนเข็มใหม่ ทั้งเครื่อง, แก้เส้นเข็ม, ตุ๊ก
M/C No.=DB-309M, วันที่=2026-02-11, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มใหม่ทั้งเครื่อง, ใช้เข็ม2ขา  G004+G005, แก้เข็มสะกิด
M/C No.=DB-3410-M, วันที่=2025-08-29, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, เข็ม2ขา G004,G005 สึกเล็กน้อย, ตุ๊ก
M/C No.=DB-3411T, วันที่=2024-12-18, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, เข็มสึกปานกลางทั้งcy+di, แก้ผ้าลาย, ตุ๊ก
M/C No.=DB-3412M, วันที่=2026-07-29, รายการซ่อม=เปลี่ยนเข็ม CY ชุดเดิม   โยกเปลี่ยน  DR, ใช้เข็ม2ขา  G004-G005  สึกเล็กน้อย, ตุ๊ก
M/C No.=DB-341M, วันที่=2026-01-24, รายการซ่อม=เปลี่ยนกระบอกDD341Mเป็นDB341M  ใช้เข็ม DB-345M, ใช้เข็ม2ขา G004 -G005   cy   สึกปานกลาง-มาก, ตุ๊ก
M/C No.=DB-345M, วันที่=2026-05-19, รายการซ่อม=ล้างเครื่อง  เรียงเข็ม 121434, ใช้เข็ม4ขาสึกปานกลาง, ตุ๊ก
M/C No.=DB-346M, วันที่=2025-07-21, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, ใช้เข็ม2ขา G006-G007 สึกปานกลาง, เช็คศูนย์ แก้ผ้าลาย, ตุ๊ก
M/C No.=DB-347M, วันที่=2026-08-17, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดเดิมสึกเล็กน้อย, เข็ม2ขาG004-G005สึกเล็กน้อย
M/C No.=DB-349M, วันที่=2026-02-03, รายการซ่อม=เปลี่ยนกระบอก28G(DA345M)เป็น32G(DB349), ใช้เข็ม2ขาG006-G007 cy  สึกปานกลาง-มาก, ตุ๊ก
M/C No.=DD-341M, วันที่=2026-07-03, รายการซ่อม=เปลี่ยนกระบอก28G(DA341M)เป็น24G(DD341M), ใช้เข็ม4ขา เครื่องDD-341M สึกเล็กน้อย, ตุ๊ก
M/C No.=DD-342-M, วันที่=2026-05-04, รายการซ่อม=ล้างเครื่อง ตั้งศูนย์ เปลี่ยนใช้เข็ม 4ขา, ใช้เข็ม4ขา สึกปานกลาง, ตุ๊ก
M/C No.=DD-343M, วันที่=2025-06-02, รายการซ่อม=ล้างเครื่อง เปลี่ยนเข็มชุดใหม่  ใช้เข็มเครื่องDD341M, ใช้เข็ม4ขา สึกเล็กน้อย, ตุ๊ก
M/C No.=DD-344W, วันที่=2026-07-08, รายการซ่อม=เปลี่ยนกระบอก  DA-344W เป็น DD-344W, ใช้เข็ม4ขา  เข็มเครื่อง DD-343M   สึกเล็กน้อย, ตุ๊ก
M/C No.=DG-341M, วันที่=2025-09-25, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม    ''ชักเข็ม'', ใช้เข็ม4ขา สึกปานกลาง
M/C No.=DG-342W, วันที่=2026-06-08, รายการซ่อม=ใส่เข็มเต็ม 4 ขา, ใช้เข็ม 4 ขา, ตุ๊ก
M/C No.=DG-343W, วันที่=2025-06-09, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, ใช้เข็ม4ขา สึกปานกลาง, ตุ๊ก
M/C No.=DG-344M, วันที่=2025-05-28, รายการซ่อม=ล้างเครื่อง เปลี่ยนเข็มใหม่, ใช้เข็ม4ขา, เปลี่ยน    Design, ตุ๊ก
M/C No.=DP-3410M, วันที่=2026-05-25, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่ใช้เข็มDP-349M, เข็ม CY+DIAL   สึกเล็กน้อย, ตุ๊ก
M/C No.=DP-341M, วันที่=20พ.ค65, รายการซ่อม=ล้างเครื่องเปลี่ยนเข็มใหม่, แก้เส้นเข็ม
M/C No.=DP-342M, วันที่=2025-10-20, รายการซ่อม=ล้างเครื่องเปลี่ยนเข็มชุดใหม่ใช้เข็ม DP-347M, เข็มสึกเล็กน้อยทั้งCY+Dial, PM, ตุ๊ก
M/C No.=DP-343M, วันที่=2024-07-19, รายการซ่อม=ล้างเครื่อง คัดเข็ม เช็คศูนย์   ใช้เข็มDP342M, เข็ม cy+di สึกเล็กน้อย, ตุ๊ก
M/C No.=DP-344M, วันที่=Date, รายการซ่อม=รายการซ่อม, รายการเปลี่ยน, สาเหตุ, ชื่อ
M/C No.=DP-345W, วันที่=23ธ.ค68, รายการซ่อม=ล้างเครื่อง เปลี่ยนกระบอกDB-3415W  เป็น DP-345W, เข็มสึกเล็กน้อย ทั้ง CY+DIAL, ตุ๊ก
M/C No.=DP-346W, วันที่=2026-01-05, รายการซ่อม=ล้างเครื่อง เปลี่ยนกระบอกDB3416Wเป็นDP346W, ใช้เข็ม DP-345W สึกเล็กน้อย, ตุ๊ก
M/C No.=DP-347M, วันที่=2025-11-27, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่ ใช้เข็ม DP348M, สึกเล็กน้อย cy+di, ตีก
M/C No.=DP-348M, วันที่=2025-11-06, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ ใช้เข็มชุดใหม่, เข็มเครื่องDP-342M สึกเล็กน้อย, ตุ๊ก
M/C No.=DP-349M, วันที่=2026-01-15, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่, ใช้เข็มเครื่อง DP-342M  สึกเล็กน้อย
M/C No.=DU-341B, วันที่=9ม.ค68, รายการซ่อม=ประกอบเครื่อง
M/C No.=IA-341D, วันที่=2024-08-24, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, เข็มสึกปานกลางทั้งCy-Dial, แก้ผ้าลาย
M/C No.=IA-342D, วันที่=8พ.ค64, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, เข็มCy-Di สึกปานกลาง, PM.
M/C No.=IB-341M, วันที่=2025-10-24, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มใหม่ CY+DI, ตุ๊ก
M/C No.=ID-341D, วันที่=6ต.ค66, รายการซ่อม=ล้างเครื่อง เปลี่ยนเข็มใหม่ ทั้งชุด
M/C No.=KA341-M, วันที่=2026-08-06, รายการซ่อม=ล้างเครื่อง เปลี่ยนเข็มใหม่ CY+DIAL
M/C No.=KA342-M, วันที่=2021-11-22, รายการซ่อม=เปลี่ยนเข็ม DIAL  ใหม่, แก้เส้นเข็ม
M/C No.=KD341-B, วันที่=พ.ค67, รายการซ่อม=ประกอบเครื่อง
M/C No.=KD342-B, วันที่=ต.ค67, รายการซ่อม=ประกอบเครื่อง
M/C No.=KD343-B, วันที่=ต.ค67, รายการซ่อม=ประกอบเครื่อง
M/C No.=KD344-B, วันที่=2025-09-06, รายการซ่อม=ประกอบเครื่อง +เข็มspare มากับเครื่อง
M/C No.=KD345-B, วันที่=2025-09-06, รายการซ่อม=ประกอบเครื่อง +เข็มspare มากับเครื่อง
M/C No.=KI3301-S, วันที่=Date, รายการซ่อม=รายการซ่อม, รายการเปลี่ยน, สาเหตุ
M/C No.=KI3302-S, วันที่=2016-10-09, รายการซ่อม=ประกอบเครื่อง
M/C No.=LA341-M, วันที่=20มิ.ย67, รายการซ่อม=ล้างเครื่อง เปลื่ยนเข็มใหม่, เข็มใหม่  SINKER สึกเล็กน้อย
M/C No.=LA342-M, วันที่=1พ.ย19, รายการซ่อม=เปลี่ยนสายพาน    14200     จำนวน  1  เส้น
M/C No.=LA343M, วันที่=28มิ.ย67, รายการซ่อม=ล้างเครื่อง คัดเข็ม คัดซิงเกอร์, เข็มสึกเล็กน้อย sinkerสึกปานกลาง-มาก
M/C No.=LA344T, วันที่=2026-06-01, รายการซ่อม=ล้างเครื่อง คัดเข็ม, เข็ม สึกเล็กน้อย, แก้เส้นเข็ม
M/C No.=LA345-T, วันที่=2026-06-08, รายการซ่อม=ล้างเครื่อง คัดเข็ม, เข็ม  สึกเล็กน้อย, แก้เส้นเข็ม
M/C No.=SA-301M, วันที่=2026-05-22, รายการซ่อม=ล้างเครื่องเปลี่ยนเข็มชุดใหม่ ใช้เข็มเครื่องSA302M, ใช้เข็ม  4 ขา   สึกเล็กน้อย, ตุ๊ก
M/C No.=SA-302M, วันที่=2026-07-17, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, ใช้เข็ม 4 ขา+sinker..KERN.. สึกปานกลาง, ตุ๊ก
M/C No.=SA-303P, วันที่=2012-10-11, รายการซ่อม=ล้างเครื่อง, ทอด้ายสีจบ
M/C No.=SA-304R, วันที่=2026-04-27, รายการซ่อม=ล้างเครื่องเปลี่ยนเข็ม+sinkerชุดใหม่, VO-LS+  140.41  G0066, ตุ๊ก
M/C No.=SA-305R, วันที่=8.ประแจ, รายการซ่อม=16.ครีมหนีบเข็ม
M/C No.=SA-307W, วันที่=2026-06-25, รายการซ่อม=ล้างเครื่อง คัดเข็ม เรียงเข็ม 1343424343, เข็มสึกปานกลาง-มาก+sinker สึกเล็กน้อย, PM
M/C No.=SA-3610P, วันที่=20เม.ย69, รายการซ่อม=ล้างเครื่อง  เช็คศูนย์  คัดเข็ม, เข็ม4ขาสึกปานกลาง -มาก
M/C No.=SA-362M, วันที่=2026-07-02, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, ใข้เข็ม2ขาG0025+G0026 สึกเล็กน้อย, PM.
M/C No.=SA-363M, วันที่=2025-12-09, รายการซ่อม=ล้างเครื่อง เปลี่ยนเข็มชุดใหม่  สึกเล็กน้อย, ใช้เข็ม2ขาG0025-G0026  sinker SNK56.20 G1
M/C No.=SA-366P, วันที่=2026-01-28, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, ใช้เข็ม2ขา G001-G002สึกปานกลาง, PM.
M/C No.=SA-367P, วันที่=2026-08-06, รายการซ่อม=ล้างเครื่อง   คัดเข็ม, ใช้เข็ม4ขา เข็ม+sinker สึกปานกลาง-มาก, PM, ตุ๊ก
M/C No.=SA-368R, วันที่=2025-03-04, รายการซ่อม=เปลี่ยนล้อป้อนยางใหม่ทั้งเครื่อง
M/C No.=SA-369P, วันที่=2026-08-13, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม+sinker, ใช้เข็ม 2ขา G001-G002 สึกเล็กน้อย, PM, ตุ๊ก
M/C No.=SB-361M, วันที่=2026-07-08, รายการซ่อม=เปลี่ยนสายพาน  Feed, เบอร์ 11400,11600, แตก ชำรุด
M/C No.=SB-363P, วันที่=2025-02-24, รายการซ่อม=ล้างเครื่อง คัดเข็ม, เข็ม4ขา+Sinker   สึกเล็กน้อย, PM.
M/C No.=SB-366M, วันที่=2026-06-22, รายการซ่อม=ล้างเครื่อง  คัดเข็ม เช็คศูนย์, ใช้เข็ม2ขาG0021-G0022สึกเล็กน้อย, PM, ตุ๊ก
M/C No.=SB-367P, วันที่=2025-02-14, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, เข็ม2ขา G001,G002 สึกเล็กน้อย, แก้เส้นเข็ม, ตุ๊ก
M/C No.=SB-368R, วันที่=8.ประแจ, รายการซ่อม=16.ครีมหนีบเข็ม
M/C No.=SC-301W, วันที่=2026-07-16, รายการซ่อม=เปลี่ยนกระบอกSA-306W เป็น  SC-301W, VO-LS-LC  141.30  G001
M/C No.=SC-362M, วันที่=2026-03-04, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่   ใช้เข็มเครื่องSC363M, เข็ม2ขาG005-G006สึกเล็กน้อย
M/C No.=SC-363M, วันที่=2026-05-29, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ เปลี่ยนเข็มชุดใหม่ใช้เข็มเครื่องSC368M, เข็ม 2 ขา G005,G006 สึกเล็กน้อย
M/C No.=SC-364M, วันที่=2025-05-06, รายการซ่อม=ล้างเครื่อง  เปลี่ยนเข็ม+sinkerชุดใหม่ใช้เข็มSC366M, ใช้เข็ม4ขา สึกเล็กน้อย sinker  kern, DR, ตุ๊ก
M/C No.=SC-365W, วันที่=2025-02-01, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, เข็ม+sinkerสึกปานกลาง, PM, ตุ๊ก
M/C No.=SC-366M, วันที่=2025-07-25, รายการซ่อม=ล้างเครื่อง เปลี่ยนเข็ม+SINKER (GROZ )ชุดใหม่ใช้เข็มSC-369M, ใช้เข็ม2ขาG005-G006สึกปานกลาง, PM
M/C No.=SC-367W, วันที่=2025-10-20, รายการซ่อม=ล้างเครื่อง เช็คศูนย์  คัดเข็ม, เข็ม2ขา G001-G002 สึกปานกลาง, PM, ตุ๊ก
M/C No.=SC-368M, วันที่=2026-07-31, รายการซ่อม=เปลี่ยนสายพานเส้นที่1= 9800 = 1 เส้น
M/C No.=SC-369M, วันที่=2026-03-09, รายการซ่อม=ล้างเครื่อง เช็คศูนย์ คัดเข็ม, ใช้เข็ม2ขา สึกเล็กน้อย G007- G008, เช็คศูนย์  แก้ผ้าลาย
M/C No.=SD-321D, วันที่=2พ.ย63, รายการซ่อม=ล้างเครื่องคัดเข็ม, เข็ม-sinker สึกปานกลาง-มาก+เข็มปนอายุ, PM
M/C No.=ST-321D, วันที่=2025-10-15, รายการซ่อม=ล้างเครื่อง คัดเข็ม เข็ม-sinkerสึกปานกลาง, ใช้เข็ม2ขาG003-G004, PM
M/C No.=SV-301M, วันที่=6พ.ค67, รายการซ่อม=ล้างเครื่องเปลี่ยนเข็ม+sinkerใหม่
M/C No.=TA-301TY, วันที่=2026-01-20, รายการซ่อม=ล้างเครื่อง คัดเข็ม, เข็ม+Sinker  สึกเล็กน้อย, PM, ตุ๊ก
`

const THAI_MONTHS = {
  'ม.ค': '01', 'ม.ค.': '01', 'มกรา': '01', 'มกราคม': '01',
  'ก.พ': '02', 'ก.พ.': '02', 'กุมภา': '02', 'กุมภาพันธ์': '02',
  'มี.ค': '03', 'มี.ค.': '03', 'มีนา': '03', 'มีนาคม': '03',
  'เม.ย': '04', 'เม.ย.': '04', 'เมษา': '04', 'เมษายน': '04',
  'พ.ค': '05', 'พ.ค.': '05', 'พฤษภา': '05', 'พฤษภาคม': '05',
  'มิ.ย': '06', 'มิ.ย.': '06', 'มิถุนา': '06', 'มิถุนายน': '06',
  'ก.ค': '07', 'ก.ค.': '07', 'กรกฎา': '07', 'กรกฎาคม': '07',
  'ส.ค': '08', 'ส.ค.': '08', 'สิงหา': '08', 'สิงหาคม': '08',
  'ก.ย': '09', 'ก.ย.': '09', 'กันยา': '09', 'กันยายน': '09',
  'ต.ค': '10', 'ต.ค.': '10', 'ตุลา': '10', 'ตุลาคม': '10',
  'พ.ย': '11', 'พ.ย.': '11', 'พฤศจิกา': '11', 'พฤศจิกายน': '11',
  'ธ.ค': '12', 'ธ.ค.': '12', 'ธันวา': '12', 'ธันวาคม': '12',
}

function parseThaiDate(rawStr) {
  if (!rawStr) return null
  const s = String(rawStr).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{1,2}$/.test(s)) return null
  if (['date', '8.ประแจ', '16.ครีมหนีบเข็ม', '-'].includes(s.toLowerCase())) return null

  for (const [mName, mNum] of Object.entries(THAI_MONTHS)) {
    if (s.includes(mName)) {
      const parts = s.split(mName)
      let day = parts[0]?.trim()
      let yearStr = parts[1]?.trim()

      if (!day) day = '01'
      day = day.padStart(2, '0')

      if (!yearStr) return null
      let y = parseInt(yearStr, 10)
      if (isNaN(y)) return null

      let fullYear = y
      if (y >= 50 && y <= 99) {
        fullYear = 2500 + y - 543
      } else if (y >= 0 && y <= 40) {
        if (y === 19) fullYear = 2019
        else if (y <= 30) fullYear = 2000 + y
        else fullYear = 2500 + y - 543
      }

      return `${fullYear}-${mNum}-${day}`
    }
  }

  return null
}

const normalize = (v = '') => String(v || '').toUpperCase().replace(/[\s\-_]/g, '').trim()

function calcNextPM(lastPmDateStr, pmTypeDays = 90) {
  if (!lastPmDateStr) return null
  const d = new Date(lastPmDateStr)
  if (isNaN(d.getTime())) return null
  const days = parseInt(pmTypeDays, 10) || 90
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function calcStatus(nextPmDateStr) {
  if (!nextPmDateStr) return 'SCHEDULED'
  const today = new Date().toISOString().slice(0, 10)
  return nextPmDateStr < today ? 'OVERDUE' : 'SCHEDULED'
}

async function run() {
  const { data: pmplans, error: pmErr } = await supabase.from('pmplans').select('*')
  if (pmErr) throw pmErr
  const { data: cylinders, error: cylErr } = await supabase.from('cylinders').select('*')
  if (cylErr) throw cylErr

  const cylByMc = new Map()
  cylinders.forEach(c => {
    if (c.NewMC) {
      const k = normalize(c.NewMC)
      if (!cylByMc.has(k)) cylByMc.set(k, c)
    }
    if (c.Standard) {
      const k = normalize(c.Standard)
      if (!cylByMc.has(k)) cylByMc.set(k, c)
    }
  })

  // Map aliases for specific machines e.g. SA-304R -> SA-304RM, SA-368R -> SA-368RM
  const pmByMc = new Map()
  pmplans.forEach(p => {
    const k = normalize(p.Machine_MC)
    if (!pmByMc.has(k)) pmByMc.set(k, [])
    pmByMc.get(k).push(p)
  })

  const lines = rawInput.split('\n').map(l => l.trim()).filter(Boolean)
  const matched = []
  const unmatched = []

  for (const line of lines) {
    const mcMatch = line.match(/M\/C No\.=([^,]+)/i)
    const dateMatch = line.match(/วันที่=([^,]+)/i)
    const repairMatch = line.match(/รายการซ่อม=(.+)$/i)

    if (!mcMatch) {
      unmatched.push({ line, reason: 'รูปแบบบรรทัดไม่ถูกต้อง (ไม่พบ M/C No.)' })
      continue
    }

    const rawMc = mcMatch[1].trim()
    const rawDate = dateMatch ? dateMatch[1].trim() : ''
    const rawRepair = repairMatch ? repairMatch[1].trim() : ''

    const parsedDate = parseThaiDate(rawDate)
    if (!parsedDate) {
      unmatched.push({
        mc: rawMc,
        rawDate,
        rawRepair,
        reason: `รูปแบบวันที่ไม่ถูกต้องหรือไม่สมบูรณ์ ("${rawDate}")`,
        line,
      })
      continue
    }

    let normMc = normalize(rawMc)
    let existingPms = pmByMc.get(normMc) || []

    // Check alias e.g. SA304R -> SA304RM, SA368R -> SA368RM
    if (existingPms.length === 0) {
      if (pmByMc.has(normMc + 'M')) {
        normMc = normMc + 'M'
        existingPms = pmByMc.get(normMc) || []
      }
    }

    if (existingPms.length === 0) {
      const cyl = cylByMc.get(normMc)
      if (!cyl) {
        unmatched.push({
          mc: rawMc,
          rawDate,
          parsedDate,
          rawRepair,
          reason: `ไม่พบข้อมูลเครื่องจักร / ซีเรียลเดิมในระบบ (ไม่มีใน PM Plan และ ทะเบียนกระบอก)`,
          line,
        })
        continue
      }
    }

    const targetPm = existingPms[0] || null
    const matchedCyl = cylByMc.get(normMc) || null
    const serialOld = targetPm?.Machine_KI || matchedCyl?.Serial_OLD || matchedCyl?.Serial_NOW || null

    if (!serialOld) {
      unmatched.push({
        mc: rawMc,
        rawDate,
        parsedDate,
        rawRepair,
        reason: `ไม่มีข้อมูลซีเรียลเดิม (Machine_KI / Serial_OLD)`,
        line,
      })
      continue
    }

    matched.push({
      pmId: targetPm?.id || null,
      Machine_MC: targetPm?.Machine_MC || rawMc,
      Machine_KI: serialOld,
      Location: targetPm?.Location || matchedCyl?.Location || 'GK1',
      Type: targetPm?.Type || matchedCyl?.Type || 'S',
      PM_Type: targetPm?.PM_Type || '90',
      Last_PM_Date: parsedDate,
      Remark: rawRepair,
      existingPm: targetPm,
      line,
    })
  }

  console.log(`Matched records to update: ${matched.length}`)
  console.log(`Unmatched records to report back: ${unmatched.length}`)

  // Perform updates
  let updateSuccessCount = 0
  let insertSuccessCount = 0

  for (const m of matched) {
    const nextPmDate = calcNextPM(m.Last_PM_Date, m.PM_Type)
    const status = calcStatus(nextPmDate)

    if (m.pmId) {
      // Update existing record
      const { error } = await supabase
        .from('pmplans')
        .update({
          Last_PM_Date: m.Last_PM_Date,
          Next_PM_Date: nextPmDate,
          Remark: m.Remark,
          Status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', m.pmId)

      if (error) {
        console.error(`Error updating PM ${m.Machine_MC} (${m.pmId}):`, error.message)
      } else {
        updateSuccessCount++
      }
    } else {
      // Create new PM plan record
      const { error } = await supabase
        .from('pmplans')
        .insert({
          Machine_MC: m.Machine_MC,
          Machine_KI: m.Machine_KI,
          Location: m.Location,
          Type: m.Type,
          PM_Type: m.PM_Type,
          Last_PM_Date: m.Last_PM_Date,
          Next_PM_Date: nextPmDate,
          Remark: m.Remark,
          Status: status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error(`Error inserting PM ${m.Machine_MC}:`, error.message)
      } else {
        insertSuccessCount++
      }
    }
  }

  console.log(`\n=== UPDATE RESULT ===`)
  console.log(`Successfully updated: ${updateSuccessCount}`)
  console.log(`Successfully inserted: ${insertSuccessCount}`)
  console.log(`Total matched & updated: ${updateSuccessCount + insertSuccessCount}`)

  console.log(`\n=== UNMATCHED DETAILS ===`)
  unmatched.forEach((u, i) => {
    console.log(`${i + 1}. M/C No.: "${u.mc || '-'}", วันที่: "${u.rawDate || '-'}", รายการซ่อม: "${u.rawRepair || '-'}" => สาเหตุ: ${u.reason}`)
  })
}

run()
