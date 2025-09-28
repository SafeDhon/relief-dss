// ===========================
// Firebase SDK imports
// ===========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection, // ✅ เพิ่มตรงนี้
  getDocs, // ✅ เพิ่มตรงนี้
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ===========================
// Firebase config
// ===========================
const firebaseConfig = {
  apiKey: "AIzaSyB9NIxqa9__0x9JSZplX2PS6ozqyRUPAQQ",
  authDomain: "relief-dss.firebaseapp.com",
  projectId: "relief-dss",
  storageBucket: "relief-dss.firebasestorage.app",
  messagingSenderId: "678196707176",
  appId: "1:678196707176:web:b24a49511e2674f1d1a0dd",
};

// ===========================
// Initialize Firebase
// ===========================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===========================
// ดึง refID จาก sessionStorage
// ===========================
let refID = sessionStorage.getItem("refID");
try {
  refID = JSON.parse(refID);
} catch {
  // ถ้าเก็บเป็น string ตรงๆ ก็ใช้ได้เลย
}
refID = String(refID).trim();

// ดึงค่ามา
const stored = sessionStorage.getItem("groupCheck");
let groups = null;

// ถ้ามีค่า ให้แปลงกลับ
if (stored) {
  groups = JSON.parse(stored);
}

// ===========================
// ฟังก์ชัน render ตาราง
// ===========================

function renderTableFromArray(dataArray) {
  const tbody = document.querySelector("#rescueTable tbody");
  tbody.innerHTML = "";

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='13' style='text-align:center'>⚠️ ไม่พบข้อมูล</td></tr>";
    return;
  }

  // ========================
  // Mapping แยกตาม parameter index
  // ========================
  const parameterMaps = [
    { 1: "-", 2: "-", 3: "-" }, // parameter[0] จำนวนคน
    { 1: "-", 2: "-", 3: "-" }, // parameter[1] จำนวนสิ่งของ
    { 1: "น้อยกว่า 30%", 2: "31% - 70%", 3: "มากกว่า 70%" }, // parameter[2] ระดับ
    { 1: "จัดหาเองได้", 2: "จัดหาได้บ้าง", 3: "ไม่มีทรัพยากร" }, // parameter[3] ควมพึ่งพา
    { 1: "เข้าถึงได้ปกติ", 2: "เข้าถึงได้บ้าง", 3: "เข้าถึงไม่ได้" }, // parameter[4] ความลำบาก
    { 1: "ไม่จำเป็น", 3: "จำเป็น" }, // parameter[5] พาหนะ ทอ.
    { 1: "น้อยกว่า 24 ชม.", 2: "24 ชม. - 48 ชม.", 3: "มากกว่า 48 ชม." }, // parameter[6] เวลา
    { 1: "เสียหายเล็กน้อย", 2: "เสียหายบางจุด", 3: "เสียหายทั้งหมด" }, // parameter[7] รุนแรง
    { 1: "น้อย", 2: "ปานกลาง", 3: "มาก" }, // parameter[8] เสี่ยง
  ];

  // Mapping vehicle แยกจาก parameter
  const vehicleMap = {
    1: "รถบรรทุก",
    2: "รถยูนิม็อก",
    3: "เรือ",
    4: "เฮลิคอปเตอร์",
  };

  dataArray.forEach((item, index) => {
    const row = document.createElement("tr");

    const cols = [
      index + 1, // ลำดับ
      item.address, // ชุมชน
      item.parameter?.[0], // จำนวน
      item.parameter?.[1], // จำนวน
      item.survivalBag, // ถุงยังชีพ
      parameterMaps[2][item.parameter?.[2]] ?? item.parameter?.[2] ?? "-", // ระดับ
      parameterMaps[3][item.parameter?.[3]] ?? item.parameter?.[3] ?? "-", // ควมพึ่งพา
      parameterMaps[4][item.parameter?.[4]] ?? item.parameter?.[4] ?? "-", // ความลำบาก
      parameterMaps[5][item.parameter?.[5]] ?? item.parameter?.[5] ?? "-", // พาหนะ ทอ.
      parameterMaps[6][item.parameter?.[6]] ?? item.parameter?.[6] ?? "-", // เวลา
      parameterMaps[7][item.parameter?.[7]] ?? item.parameter?.[7] ?? "-", // รุนแรง
      parameterMaps[8][item.parameter?.[8]] ?? item.parameter?.[8] ?? "-", // เสี่ยง
      vehicleMap[item.vehicle] ?? item.vehicle ?? "-", // ยานพาหนะ
    ];

    cols.forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      td.style.padding = "6px";
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });
}

// ===========================
// ฟังก์ชันดึง document ตาม refID
// ===========================
async function getDocByRefID() {
  if (!refID) {
    console.warn("⚠️ ไม่มี refID ใน sessionStorage");
    return;
  }

  try {
    const docRef = doc(db, "rescueData", refID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("✅ Document:", refID, "=>", data);

      if (Array.isArray(data._data)) {
        renderTableFromArray(data._data);
      } else {
        console.warn("⚠️ field _data ไม่ใช่ array:", data._data);
      }
    } else {
      console.log("❌ ไม่เจอ document ที่ refID =", refID);
    }
  } catch (err) {
    console.error("🔥 Error loading document:", err);
  }
}

// ===========================
// เรียกใช้งาน
// ===========================
getDocByRefID();

const checkBtn = document.getElementById("check-button");
checkBtn.addEventListener("click", async () => {
  console.log("👉 กดปุ่ม Check List แล้ว");
  console.log("📌 refID :", refID);
  console.log("📌 Groups:", groups);
  const groupLengths = groups.map((group) => group.length);
  console.log("📊 ความยาวของแต่ละกลุ่ม:", groupLengths);

  try {
    // ใช้ modular syntax
    const checkListCol = collection(db, "rescueData", refID, "checkList");
    const checkListSnapshot = await getDocs(checkListCol);

    const allGroups = {};
    checkListSnapshot.forEach((docSnap) => {
      allGroups[docSnap.id] = docSnap.data();
    });

    console.log("✅ ข้อมูลทั้งหมดจาก checkList:", allGroups);

    const lengthsByDoc = {};
    for (const docId in allGroups) {
      const fields = allGroups[docId];
      lengthsByDoc[docId] = {};
      for (const fieldName in fields) {
        // ตรวจสอบว่าค่าเป็น array ก่อน
        lengthsByDoc[docId][fieldName] = Array.isArray(fields[fieldName])
          ? fields[fieldName].length
          : 0;
      }
    }

    console.log("📊 ความยาวของแต่ละ field ในแต่ละ document:", lengthsByDoc);
    const resultArray = Object.keys(lengthsByDoc)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((docId) => Object.keys(lengthsByDoc[docId]).length);

    console.log(resultArray);
    // ✅ เปรียบเทียบ groupLengths กับ resultArray
    const isEqual =
      groupLengths.length === resultArray.length &&
      groupLengths.every((len, idx) => len === resultArray[idx]);

    if (isEqual) {
      sessionStorage.setItem("refID", refID);
      window.location.href = "../pages/check.html";
    } else {
      alert(
        `❌ กรุณาบันทึกเส้นทางให้ครบถ้วน`
      );
    }
  } catch (error) {
    console.error("❌ Error ดึงข้อมูลจาก checkList:", error);
  }
});
