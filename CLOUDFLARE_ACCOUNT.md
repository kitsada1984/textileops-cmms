# 🔒 นโยบายบัญชีและการ Deploy (Cloudflare Account & Deployment Policy)

> **⚠️ กฎเหล็กสำคัญที่สุดของโปรเจกต์:**  
> โปรเจกต์ **TextileOps CMMS** ผูกกับบัญชี **`kitsada1984@gmail.com`** เท่านั้น **ห้ามสลับหรือข้ามไปใช้บัญชีอื่นโดยเด็ดขาด** (เช่น บัญชีหอพัก `kitsada0359@gmail.com` หรือบัญชีส่วนตัวอื่นๆ)

---

## 📋 1. ข้อมูลบัญชีและโครงสร้างระบบคลาวด์ (Cloud Credentials Reference)

| รายการ | ค่าที่ถูกต้อง (Fixed & Authorized) | หมายเหตุ |
| :--- | :--- | :--- |
| **Cloudflare Account Owner** | **`kitsada1984@gmail.com`** | **บัญชีเดียวเท่านั้น** ห้ามเปลี่ยน |
| **Cloudflare Account ID** | `392e2aeb2648effccebd585e5c29611b` | บัญชีของ kitsada1984 |
| **Pages Project Name** | `textileops-cmms` | Cloudflare Pages (Direct Upload) |
| **Production Domain** | `https://textileops-cmms.pages.dev` | โดเมนหลักใช้งานจริง |
| **D1 Database Binding** | `DB` | ตารางฐานข้อมูลหลักบน Edge |
| **D1 Database Name** | `textileops-db` | ฐานข้อมูล Cloudflare D1 |
| **D1 Database ID** | `b54a2924-8238-408b-ab82-b329dcc6e16d` | ระบุใน `wrangler.toml` |
| **GitHub Repository** | `https://github.com/kitsada1984/textileops-cmms.git` | Branch: `master` |

---

## 🚫 2. กฎการตรวจสอบความปลอดภัยของบัญชี (Account Verification Rules)

ก่อนที่จะรันคำสั่งใดๆ ที่เกี่ยวข้องกับ Cloudflare (Deploy, จัดการ D1, Query ข้อมูล):
1. **ตรวจสอบบัญชีที่ Active อยู่เสมอ:**
   ```powershell
   npx wrangler whoami
   ```
2. **เงื่อนไข:** 
   - ถ้า Account Email แสดงเป็น `kitsada1984@gmail.com` และ Account ID เป็น `392e2aeb2648effccebd585e5c29611b` 👉 **ดำเนินการต่อได้ทันที**
   - ถ้าแสดงเป็นบัญชีอื่น (เช่น `kitsada0359@gmail.com`) 👉 **ห้ามรันคำสั่ง Deploy เด็ดขาด** ให้สั่ง Re-login ด้วยบัญชีที่ถูกต้องทันที:
     ```powershell
     npx wrangler logout
     npx wrangler login
     ```
     *(แล้วเลือกยืนยันสิทธิ์ด้วย `kitsada1984@gmail.com` เท่านั้น)*

---

## 🚀 3. ขั้นตอนการ Deploy ขึ้น Cloudflare Pages ที่สมบูรณ์ (Standard Release Protocol)

โปรเจกต์นี้ตั้งค่า Cloudflare Pages เป็นแบบ **Direct Upload** (ไม่ได้ผูก Git Auto-Build) ดังนั้นการ Commit & Push ขึ้น GitHub อย่างเดียว **จะไม่ทำให้หน้าเว็บอัปเดต** ต้องรัน Deploy ผ่าน Wrangler ตามลำดับขั้นตอนดังนี้:

### ขั้นตอนที่ 1: ตรวจสอบ Unit Tests
```powershell
npm test
```
*(ต้องผ่าน 100% ครบทุก Test Suite)*

### ขั้นตอนที่ 2: Bump Version 3 จุดพร้อมกัน
- `src/version.js` (`APP_VERSION = 'v1.3.xxx'`)
- `package.json` (`"version": "1.3.xxx"`)
- `public/sw.js` (`const CACHE_NAME = 'textileops-v1.3.xxx'`)

### ขั้นตอนที่ 3: Build Production Bundle
```powershell
npm run build
```

### ขั้นตอนที่ 4: Git Commit & Push ขึ้น GitHub
```powershell
git add .
git commit -m "feat/fix(...): รายละเอียดการอัปเดต v1.3.xxx"
git push origin master
```

### ขั้นตอนที่ 5: Deploy ขึ้น Cloudflare Pages ด้วยบัญชี kitsada1984@gmail.com
```powershell
npx wrangler pages deploy dist --project-name textileops-cmms
```

### ขั้นตอนที่ 6: ตรวจสอบความถูกต้องบนระบบจริง (Live Verification)
```powershell
(Invoke-WebRequest -Uri "https://textileops-cmms.pages.dev/sw.js" -UseBasicParsing).Content.Substring(0, 50)
```
*(ตรวจสอบว่า Cache Name ตรงกับเวอร์ชันล่าสุดที่เพิ่ง Deploy หรือไม่)*

---

## 📌 สรุป
- **ห้ามใช้บัญชีอื่นนอกจาก `kitsada1984@gmail.com`**
- ทุกครั้งที่ส่งงาน ต้องรันคำสั่ง **`npx wrangler pages deploy dist --project-name textileops-cmms`** งานจึงจะขึ้น Cloudflare Pages
