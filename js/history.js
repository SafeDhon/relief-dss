import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB9NIxqa9__0x9JSZplX2PS6ozqyRUPAQQ",
  authDomain: "relief-dss.firebaseapp.com",
  projectId: "relief-dss",
  storageBucket: "relief-dss.firebasestorage.app",
  messagingSenderId: "678196707176",
  appId: "1:678196707176:web:b24a49511e2674f1d1a0dd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ ตรวจสอบสถานะการล็อกอิน
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // ❌ ยังไม่ได้ล็อกอิน → กลับไปหน้า login
    window.location.href = "../pages/login.html";
  } else {
    console.log("ผู้ใช้เข้าสู่ระบบแล้ว:", user.email);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const homeBtn = document.getElementById("homeBtn");
  const container = document.querySelector(".container");

  if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.href = "../pages/home.html";
    });
  }

  // 🔹 ดึงข้อมูลจาก Firestore เรียงตามวันที่ (ใหม่สุดก่อน)
  const q = query(collection(db, "rescueData"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);

  let html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>ลำดับ</th>
          <th>วันที่สร้าง</th>
          <th>วันที่จัดส่ง</th>
          <th>จัดส่งโดย</th>
          <th>จำนวน (ชุมชน)</th>
          
        </tr>
      </thead>
      <tbody>
  `;

  const wingMap = {
    1: "กองบิน 1",
    2: "กองบิน 2",
    3: "กองบิน 3",
    4: "กองบิน 4",
    5: "กองบิน 5",
    6: "กองบิน 6",
    7: "กองบิน 7",
    21: "กองบิน 21",
    23: "กองบิน 23",
    41: "กองบิน 41",
    46: "กองบิน 46",
    56: "กองบิน 56",
    100: "โรงเรียนการบิน",
    // เพิ่มได้เรื่อย ๆ
  };

  // ฟังก์ชันแปลง Timestamp เป็นวันที่ไทย
  function formatThaiDate(timestamp) {
    if (!timestamp) return "-";

    // ถ้ามาเป็น Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    const thaiMonths = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // พ.ศ.

    return `${day} ${month} ${year}`;
  }

  let index = 1;
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.date) return;
    const formattedDate1 = formatThaiDate(data.timestamp);
    const formattedDate2 = formatThaiDate(data.date);
    html += `
      <tr class="data-row" data-id="${doc.id}">
        <td>${index++}</td>
        <td>${formattedDate1 || "-"}</td>
        <td>${formattedDate2 || "-"}</td>
        <td>${wingMap[data.wing] || "-"}</td>
        <td>${data._data.length || "-"}</td>
        
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML += html;

  // ✅ จัดการคลิกแถว
  document.querySelectorAll(".data-row").forEach((row) => {
    row.addEventListener("click", () => {
      const id = row.getAttribute("data-id");
      console.log("📄 Document ID:", id);
      window.location.href = `../pages/check.html?refID=${encodeURIComponent(
        id
      )}`;
    });
  });
});
