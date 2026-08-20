# TextileOps Apps Script Upload Flow

หลักการทำงาน:

1. เว็บ TextileOps ส่งไฟล์รูปไปที่ `/api/drive-upload`
2. API ของ Vercel ส่งต่อไป Google Apps Script Web App
3. Apps Script สร้างไฟล์รูปใน Google Drive
4. Apps Script ส่งลิงก์กลับมาเป็น `url` และ `webViewLink`
5. เว็บบันทึกลิงก์นั้นลงคอลัมน์ `ImageUrl` ซึ่งแสดงชื่อคอลัมน์เป็น `URL`

## วิธีติดตั้ง Apps Script

1. เปิด `https://script.google.com/`
2. สร้างโปรเจกต์ใหม่
3. คัดลอกโค้ดจาก `integrations/google-drive-webhook/Code.gs` ไปวางในไฟล์ `Code.gs`
4. กด `Deploy` > `New deployment`
5. เลือก type เป็น `Web app`
6. ตั้งค่า `Execute as` เป็น `Me`
7. ตั้งค่า `Who has access` เป็น `Anyone`
8. กด `Deploy`
9. คัดลอก Web app URL ที่ลงท้ายด้วย `/exec`
10. ส่ง URL นั้นมาให้ตั้งค่าใน Vercel env `GOOGLE_DRIVE_UPLOAD_WEBHOOK`

## โฟลเดอร์เก็บรูป

ถ้าไม่ตั้งค่าอะไรเพิ่ม Apps Script จะสร้างโฟลเดอร์ชื่อ `TextileOps Uploads` ใน Google Drive ของเจ้าของ Script ให้อัตโนมัติ

ถ้าต้องการเก็บในโฟลเดอร์เดิม:

1. เปิด Apps Script
2. ไปที่ `Project Settings`
3. เพิ่ม `Script properties`
4. ใส่ key `DRIVE_FOLDER_ID`
5. ใส่ value เป็น Folder ID ของ Google Drive

หมายเหตุ: ต้องเป็น Folder ID ไม่ใช่ Google Sheet ID
