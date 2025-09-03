require("dotenv").config();
const nodemailer = require("nodemailer");
const fs = require("fs");

// Baca daftar email tujuan dari file
const emailList = fs.readFileSync("emails.txt", "utf-8")
  .split("\n")
  .map(e => e.trim())
  .filter(e => e.length > 0);

// Setup transporter Gmail
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Delay random untuk menghindari deteksi sebagai spam
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Variasi subject line
const subjects = [
  "📌 Informasi Penting untuk Anda",
  "⚡ Update Terbaru yang Harus Dibaca",
  "🔔 Pemberitahuan Penting"
];

// Variasi body email dengan template yang berbeda
const bodies = [
  recipient => `
    <div style="font-family:'Poppins', sans-serif; line-height:1.7; max-width:600px; margin:0 auto; background:#0f0f23;">
      <div style="padding:40px;">
        <h1 style="color:#fff; margin:0 0 20px 0; font-size:28px; text-shadow:0 0 10px #00ffff;">⚡ Hai ${recipient},</h1>
        <p style="color:#8b8b92; font-size:16px;">Ada <span style="color:#00ffff; text-shadow:0 0 5px #00ffff; font-weight:bold;">informasi penting</span> yang tidak boleh Anda lewatkan!</p>
        <div style="background:#16213e; border:1px solid #00ffff; padding:20px; margin:25px 0; border-radius:10px; box-shadow:0 0 20px rgba(0,255,255,0.1);">
          <p style="margin:0; color:#00ffff; font-size:16px; font-weight:bold;">🎯 URGENT: Is your account still active? Check Now</p>
        </div>
        <p style="color:#8b8b92;">Cyber regards,<br><span style="color:#00ffff;">${process.env.EMAIL_NAME}</span></p>
      </div>
    </div>
    <hr>
    <small style="color:gray;">Email ini bersifat penting. Jika Anda tidak ingin menerima lagi, abaikan saja.</small>
  `,
  recipient => `
    <div style="font-family:'Poppins', sans-serif; line-height:1.7; max-width:600px; margin:0 auto; background:#0f0f23;">
      <div style="padding:40px;">
        <h1 style="color:#fff; margin:0 0 20px 0; font-size:28px; text-shadow:0 0 10px #00ffff;">⚡ Update untuk ${recipient},</h1>
        <p style="color:#8b8b92; font-size:16px;">Kami memiliki <span style="color:#00ffff; text-shadow:0 0 5px #00ffff; font-weight:bold;">pembaruan penting</span> untuk Anda!</p>
        <div style="background:#16213e; border:1px solid #00ffff; padding:20px; margin:25px 0; border-radius:10px; box-shadow:0 0 20px rgba(0,255,255,0.1);">
          <p style="margin:0; color:#00ffff; font-size:16px; font-weight:bold;">🔒 STATUS: active account check</p>
        </div>
        <p style="color:#8b8b92;">Best regards,<br><span style="color:#00ffff;">${process.env.EMAIL_NAME}</span></p>
      </div>
    </div>
    <hr>
    <small style="color:gray;">Email otomatis - mohon tidak dibalas.</small>
  `
];

// Fungsi untuk mengirim email dengan retry mechanism
async function sendEmail(to, retries = 2) {
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)](to);

  const mailOptions = {
    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: body,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
      "List-Unsubscribe": `<mailto:${process.env.EMAIL_USER}>`,
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [${new Date().toISOString()}] Terkirim ke ${to}: ${info.response}`);
    return { success: true, recipient: to };
  } catch (err) {
    console.error(`❌ [${new Date().toISOString()}] Gagal ke ${to}:`, err.message);
    
    // Jika gagal, coba lagi sesuai jumlah retry
    if (retries > 0) {
      console.log(`🔁 Mencoba lagi (${retries} percobaan tersisa) ke ${to}...`);
      await sleep(5000); // Tunggu 5 detik sebelum retry
      return await sendEmail(to, retries - 1);
    }
    
    return { success: false, recipient: to };
  }
}

// Fungsi utama untuk mengirim semua email
async function sendEmails() {
  console.log("🚀 Memulai pengiriman email...");
  console.log(`📧 Jumlah email yang akan dikirim: ${emailList.length}\n`);

  const failedEmails = [];
  const sentEmails = [];

  // Kirim email ke semua penerima
  for (const recipient of emailList) {
    const result = await sendEmail(recipient);
    
    if (result.success) {
      sentEmails.push(result.recipient);
    } else {
      failedEmails.push(result.recipient);
    }

    // Delay random 3-8 detik untuk menghindari deteksi spam
    const delay = Math.floor(Math.random() * 5000) + 3000;
    await sleep(delay);
  }

  // Tampilkan hasil
  console.log(`\n📊 Hasil Pengiriman:`);
  console.log(`✅ Berhasil: ${sentEmails.length}`);
  console.log(`❌ Gagal: ${failedEmails.length}`);

  // Coba lagi untuk email yang gagal
  if (failedEmails.length > 0) {
    console.log("\n🔄 Mengirim ulang email yang gagal...");
    
    for (const recipient of failedEmails) {
      const result = await sendEmail(recipient, 1);
      
      if (result.success) {
        // Hapus dari daftar gagal jika berhasil
        failedEmails.splice(failedEmails.indexOf(recipient), 1);
      }
      
      await sleep(3000);
    }
  }

  console.log("\n🎯 Proses selesai!");
  console.log(`✅ Total berhasil: ${sentEmails.length}`);
  console.log(`❌ Total gagal: ${failedEmails.length}`);
  
  if (failedEmails.length > 0) {
    console.log("\n📋 Daftar email yang gagal:");
    failedEmails.forEach(email => console.log(`   - ${email}`));
  }
}

// Jalankan program
sendEmails().catch(console.error);
