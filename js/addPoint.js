import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Firebase config
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

document.getElementById("nextBtn").addEventListener("click", async () => {
  const wing = Number(document.getElementById("searchOptions").value);
  const community = document
    .querySelector("input[placeholder='กรอกชื่อชุมชน...']")
    .value.trim();
  const latitude = document
    .querySelector("input[placeholder='ละติจูด']")
    .value.trim();
  const longitude = document
    .querySelector("input[placeholder='ลองจิจูด']")
    .value.trim();

  // 🔹 ตรวจสอบ input
  if (!wing) {
    alert("กรุณาเลือกกองบินก่อนบันทึก");
    return;
  }

  if (!community) {
    alert("กรุณากรอกชื่อชุมชนก่อนบันทึก");
    return;
  }

  if (!latitude || isNaN(latitude)) {
    alert("กรุณากรอกละติจูดเป็นตัวเลข");
    return;
  }

  if (!longitude || isNaN(longitude)) {
    alert("กรุณากรอกลองจิจูดเป็นตัวเลข");
    return;
  }

  // แปลงเป็นตัวเลข
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);

  try {
    const docRef = await addDoc(collection(db, "communities"), {
      wing: wing,
      community: community,
      latitude: latNum,
      longitude: lngNum,
      createdAt: new Date().toISOString(),
    });
    alert("เพิ่มข้อมูลสำเร็จ! ID: ");
    document.querySelector("input[placeholder='กรอกชื่อชุมชน...']").value = "";
    document.querySelector("input[placeholder='ละติจูด']").value = "";
    document.querySelector("input[placeholder='ลองจิจูด']").value = "";
  } catch (e) {
    console.error("Error adding document: ", e);
    alert("เกิดข้อผิดพลาด: " + e.message);
  }
});
