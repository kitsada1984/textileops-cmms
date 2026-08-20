# Machine Tag Image Storage Concept

คอนเซปการเก็บรูปภาพของเมนู `เครื่องจักร`:

1. ผู้ใช้เลือกรูปแท็กเครื่องจักรในฟอร์มเครื่องจักร
2. เว็บส่งรูปไป `/api/drive-upload`
3. API ส่งต่อไป Google Apps Script Web App
4. Apps Script สร้างไฟล์ใน Google Drive ใต้โฟลเดอร์ `TextileOps Uploads/แท็กเครื่องจักร`
5. Apps Script ส่งลิงก์กลับมาเป็น `url` และ `webViewLink`
6. เว็บเก็บลิงก์ลงฟิลด์ `ImageUrl`
7. ตารางเครื่องจักรแสดงคอลัมน์ `URL` และ `รูป`
8. ถ้าฐานข้อมูลยังไม่มีคอลัมน์ `ImageUrl` ระบบจะเก็บลิงก์สำรองใน `Remark` ด้วย prefix `ImageUrl:`

โฟลเดอร์ที่ใช้:

```text
TextileOps Uploads/
  แท็กเครื่องจักร/
```

ถ้า Apps Script ตั้งค่า `DRIVE_FOLDER_ID` ไว้ โครงสร้างจะเป็น:

```text
<DRIVE_FOLDER_ID>/
  แท็กเครื่องจักร/
```
