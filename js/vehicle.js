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

function buildTable(data) {
  console.log(data);
  var table = document.getElementById("myTable");
  for (var i = 0; i < data.length; i++) {
    let param1 = "";
    switch (data[i].parameter[4]) {
      case 1:
        param1 = "เข้าถึงได้ปกติ";
        break;
      case 2:
        param1 = "เข้าถึงได้บ้าง";
        break;
      case 3:
        param1 = "เข้าถึงไม่ได้";
        break;
      default:
        param1 = "-"; // กัน error ถ้าไม่มีค่า
    }

    let param2 = "";
    switch (data[i].parameter[5]) {
      case 1:
        param2 = "ไม่จำเป็น";
        break;
      case 3:
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
                  
                  <td>
                    <select name="level" class="level-select">
                      <option value="1">รถบรรทุก</option>
                      <option value="2">รถยูนิม็อก</option>
                      <option value="3">เรือ</option>
                      <option value="4">เฮลิคอปเตอร์</option>
                    </select>
                  </td>
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

    if (survivalBagInput && vehicleSelect) {
      const survivalBag = parseInt(survivalBagInput.value);
      const vehicle = parseInt(vehicleSelect.value);

      result.push({
        survivalBag: survivalBag,
        vehicle: vehicle,
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
