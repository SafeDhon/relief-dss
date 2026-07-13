import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

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

// export ให้ vehicle.js ใช้
window._firebaseDB = db;
window._firebaseAddDoc = addDoc;
window._firebaseCollection = collection;
window._firebaseDoc = doc;
window._firebaseSetDoc = setDoc;

function getData() {
  var sortedDataJson = sessionStorage.getItem("sortedData");
  let sortedData = null;
  if (sortedDataJson) {
    try {
      sortedData = JSON.parse(sortedDataJson);
    } catch (e) {
      console.error("Error parsing sortedData from sessionStorage:", e);
    }
  }

  if (sortedData) {
    console.log("ข้อมูล Sorted ที่ได้รับ (Array of Objects):", sortedData);
    return sortedData;
  } else {
    console.log("ไม่พบข้อมูลที่ส่งมา หรือเกิดข้อผิดพลาดในการดึงข้อมูล.");
    return null;
  }
}

function getOrigin() {
  var originData = sessionStorage.getItem("originData");
  if (originData) {
    console.log("ข้อมูล Origin ที่ได้รับ (String):", originData);
    return originData;
  } else {
    console.log("ไม่พบข้อมูลที่ส่งมา หรือเกิดข้อผิดพลาดในการดึงข้อมูล.");
    return null;
  }
}

function buildVehicleCell(accessLevel) {
  if (accessLevel === 5) {
    return `<select name="level" class="level-select">
      <option value="3">เรือ</option>
      <option value="4">ฮอลิคอปเตอร์</option>
    </select>`;
  }
  return `<span class="no-vehicle">-</span>`;
}

function buildTable(data) {
  console.log(data);
  var table = document.getElementById("myTable");
  for (var i = 0; i < data.length; i++) {
    let param1 = "";
    switch (data[i].parameter[4]) {
      case 1:
        param1 = "เข้าถึงได้ปกติ";
        break;
      case 3:
        param1 = "เข้าถึงได้ยากบางจุด";
        break;
      case 5:
        param1 = "ไม่สามารถเข้าถึงได้ทางถนน";
        break;
      default:
        param1 = "-"; // กัน error ถ้าไม่มีค่า
    }

    let param2 = "";
    switch (data[i].parameter[5]) {
      case 1:
        param2 = "ไม่จำเป็น";
        break;
      case 5:
        param2 = "จำเป็น";
        break;
      default:
        param2 = "-"; // กัน error ถ้าไม่มีค่า
    }

    var row = `<tr>
                  <td>${data[i].id}.</td>
                  <td>${data[i].address}</td>
                <td>${data[i].victim}</td>
                <td><input type="number" class="number-input" min="0" autocomplete="new-password" value="${Math.ceil(
                  data[i].victim / 4
                )}"></td>  
                <td>${param1}</td>
                <td>${param2}</td>
                  
                  <td>${buildVehicleCell(data[i].parameter[4])}</td>
              </tr>`;
    table.innerHTML += row;
  }
}

buildTable(getData());

function getTableData() {
  const table = document.getElementById("myTable");
  const rows = table.querySelectorAll("tbody tr"); // เลือกทุกแถวใน tbody
  const result = [];

  rows.forEach((row) => {
    const survivalBagInput = row.querySelector(".number-input");
    const vehicleSelect = row.querySelector(".level-select");

    if (survivalBagInput) {
      result.push({
        survivalBag: parseInt(survivalBagInput.value),
        vehicle: vehicleSelect ? parseInt(vehicleSelect.value) : null,
      });
    }
  });
  return result;
}

var butt = document.getElementById("saveDataButton");
var butt = document.getElementById("saveDataButton");
butt.addEventListener("click", async function () {
  var _bagVehicle = getTableData();
  var _data = getData();

  if (_data.length === _bagVehicle.length) {
    for (let i = 0; i < _data.length; i++) {
      _data[i].survivalBag = _bagVehicle[i].survivalBag;
      _data[i].vehicle = _bagVehicle[i].vehicle;
    }
  } else {
    console.warn("จำนวนสมาชิกใน _data และ _bagVehicle ไม่เท่ากัน");
  }

  // ── Rule 1: null vehicle → ยูนิม็อก ────────────────────────────────────────
  for (let i = 0; i < _data.length; i++) {
    if (_data[i].vehicle === null) {
      _data[i].vehicle = 2;
    }
  }

  // ── Rule 2: รอบสุดท้ายของยูนิม็อก < 250 ถุง → ลองเปลี่ยนเป็นรถบรรทุก ──────
  const UNIMOG_CAPACITY = 400;
  const TRUCK_THRESHOLD = 250;

  const unimogIndices = _data
    .map((c, i) => (c.vehicle === 2 ? i : -1))
    .filter((i) => i >= 0);

  if (unimogIndices.length > 0) {
    // แตกแต่ละชุมชนที่เกิน capacity เป็น parts พร้อมเก็บ index
    const allParts = [];
    unimogIndices.forEach((idx) => {
      const c = _data[idx];
      let remaining = c.survivalBag;
      while (remaining > 0) {
        const take = Math.min(remaining, UNIMOG_CAPACITY);
        allParts.push({
          _idx: idx,
          _take: take,
          _accessLevel: c.parameter[4],
        });
        remaining -= take;
      }
    });

    // จัดกลุ่มตาม capacity
    const groups = [];
    let curGroup = [];
    let curSum = 0;
    allParts.forEach((p) => {
      if (curSum + p._take > UNIMOG_CAPACITY) {
        groups.push(curGroup);
        curGroup = [];
        curSum = 0;
      }
      curGroup.push(p);
      curSum += p._take;
    });
    if (curGroup.length > 0) groups.push(curGroup);

    const lastGroup = groups[groups.length - 1];
    const lastGroupTotal = lastGroup.reduce((sum, p) => sum + p._take, 0);

    if (lastGroupTotal < TRUCK_THRESHOLD) {
      const hasModerateAccess = lastGroup.some((p) => p._accessLevel === 3);
      if (!hasModerateAccess) {
        lastGroup.forEach((p) => {
          _data[p._idx].vehicle = 1;
        });
      }
    }
  }

  var _originWing = getOrigin();
  sessionStorage.setItem("originWing", _originWing);
  sessionStorage.setItem("addedData", JSON.stringify(_data));

  console.log(_data);

  try {
    const db = window._firebaseDB;
    const addDoc = window._firebaseAddDoc;
    const collection = window._firebaseCollection;
    const docFn = window._firebaseDoc;
    const setDocFn = window._firebaseSetDoc;

    const docRef = await addDoc(collection(db, "rescueData"), {
      timestamp: new Date().toISOString(),
      _data: _data,
      wing: _originWing,
      date: "",
    });
    console.log("บันทึกข้อมูลเรียบร้อย! Document ID:", docRef.id);
    sessionStorage.setItem("refID", docRef.id);
    const checkListDocs = ["1", "2", "3", "4"];
    for (const docId of checkListDocs) {
      const subDocRef = docFn(db, "rescueData", docRef.id, "checkList", docId);
      await setDocFn(subDocRef, {}); // ว่างก่อน สามารถใส่ field เพิ่มภายหลัง
    }
    console.log("✅ สร้าง subcollection checkList เรียบร้อย");
    window.location.href = "../pages/sorted.html";
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการบันทึก Firebase:", err);
  }
});

const backBtn = document.getElementById("backBtn");
backBtn.addEventListener("click", () => {
  window.location.href = "home.html";
});
