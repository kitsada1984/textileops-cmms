# Cylinder Image Storage Concept

คอนเซปการเก็บรูปภาพของเมนู `กระบอก`:

1. ผู้ใช้เลือกรูปในฟอร์มกระบอก
2. เว็บส่งรูปไป `/api/drive-upload`
3. API ส่งต่อไป Google Apps Script Web App
4. Apps Script สร้างไฟล์ใน Google Drive ใต้โฟลเดอร์ `TextileOps Uploads/รูปกระบอก`
5. Apps Script ส่งลิงก์กลับมาเป็น `url` และ `webViewLink`
6. เว็บเก็บลิงก์ลงฟิลด์ `ImageUrl`
7. ตารางกระบอกแสดงคอลัมน์ `URL` และ `รูป`
8. ถ้าฐานข้อมูลยังไม่มีคอลัมน์ `ImageUrl` ระบบจะเก็บลิงก์สำรองใน `Comment` ด้วย prefix `ImageUrl:`

โฟลเดอร์ที่ใช้:

```text
TextileOps Uploads/
  รูปกระบอก/
```

ถ้า Apps Script ตั้งค่า `DRIVE_FOLDER_ID` ไว้ โครงสร้างจะเป็น:

```text
<DRIVE_FOLDER_ID>/
  รูปกระบอก/
```
