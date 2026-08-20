# Google Drive Upload Setup

แนะนำให้ใช้อัปโหลดผ่าน Google Apps Script Web App เพราะไฟล์จะถูกสร้างด้วยบัญชี Gmail เจ้าของ Drive โดยตรง และไม่ชนข้อจำกัด `Service Accounts do not have storage quota`.

## วิธีที่แนะนำ: Google Apps Script

1. เปิด `https://script.google.com/`
2. สร้างโปรเจกต์ใหม่
3. วางโค้ดจาก `integrations/google-drive-webhook/Code.gs`
4. ถ้าต้องการเก็บไฟล์ในโฟลเดอร์เฉพาะ ให้ใส่ folder id ใน `TARGET_FOLDER_ID`
5. กด `Deploy` > `New deployment`
6. เลือก type เป็น `Web app`
7. ตั้งค่า `Execute as` เป็น `Me`
8. ตั้งค่า `Who has access` เป็น `Anyone`
9. กด `Deploy` แล้วคัดลอก Web app URL
10. ใส่ URL นั้นใน Vercel env ชื่อ `GOOGLE_DRIVE_UPLOAD_WEBHOOK`

คำสั่งตัวอย่าง:

```powershell
vercel env add GOOGLE_DRIVE_UPLOAD_WEBHOOK production --value "https://script.google.com/macros/s/xxxxx/exec" --yes --force
vercel deploy --prod --yes
```

## วิธีสำรอง: Service Account

Service account ต้องอัปโหลดเข้าโฟลเดอร์ใน Shared Drive เท่านั้น หรือสภาพแวดล้อมที่มี delegated OAuth เหมาะสม ถ้าใช้ root Drive ของ service account จะเจอ error ว่าไม่มี storage quota

ต้องตั้งค่า:

```env
GOOGLE_SERVICE_ACCOUNT_JSON=service_account_json
GOOGLE_DRIVE_FOLDER_ID=shared_drive_folder_id
```

ระบบจะเรียก `/api/drive-upload` เป็นค่าเริ่มต้น ถ้ามี `GOOGLE_DRIVE_UPLOAD_WEBHOOK` จะส่งต่อไป Apps Script ก่อน ถ้าไม่มีจึงค่อยใช้ service account

## OpenAI สำหรับค้นหารูปคล้าย

ถ้าต้องการวิเคราะห์รูปและค้นหารูปคล้าย ให้ตั้งค่าเพิ่ม:

```env
VITE_OPENAI_API_KEY=your_openai_api_key
```
