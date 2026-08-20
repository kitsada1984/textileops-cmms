# Purchasing Image Search (Plan B)

ต้องเพิ่มคอลัมน์ในตาราง `purchaseorders` ก่อน:

```sql
alter table public.purchaseorders
  add column if not exists "ImageUrl" text,
  add column if not exists "ImageFingerprint" text,
  add column if not exists "ImageEmbedding" jsonb;
```

ตั้งค่า `.env`:

```env
VITE_OPENAI_API_KEY=your_openai_api_key
# optional
GOOGLE_DRIVE_UPLOAD_WEBHOOK=https://script.google.com/macros/s/xxxxx/exec
VITE_OPENAI_VISION_MODEL=gpt-4.1-mini
VITE_OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

ค่าเริ่มต้นของระบบจะอัปโหลดผ่าน endpoint ภายใน `/api/drive-upload`
โดย `/api/drive-upload` จะส่งต่อไป `GOOGLE_DRIVE_UPLOAD_WEBHOOK` ถ้าตั้งค่าไว้ แนะนำให้ใช้ Google Apps Script Web App เพราะ service account ไม่มี storage quota สำหรับ My Drive ปกติ

วิธีใช้:
1. เปิดเมนู Purchasing
2. เลือกรูปในช่อง `อัปโหลดรูป (Google Drive อัตโนมัติ)` ระบบจะอัปโหลดผ่าน `/api/drive-upload` ให้ทันที
3. ระบบจะบันทึกลิงก์ลง `ImageUrl` และสร้าง embedding อัตโนมัติ
4. กดบันทึก
5. เวลาค้นหา ให้ใส่ลิงก์รูปในช่อง `ค้นหาจากลิงก์รูป...` แล้วกด `ค้นหารูป`

รูปแบบ response จาก webhook ที่รองรับ:

```json
{
  "fileId": "xxxxx",
  "webViewLink": "https://drive.google.com/file/d/xxxxx/view"
}
```
