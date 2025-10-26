import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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

async function findDelivery(address, deliveries) {
  for (const item of deliveries) {
    for (const key of Object.keys(item)) {
      if (Array.isArray(item[key])) {
        for (const obj of item[key]) {
          if (obj["ปลายทาง"] === address) {
            return obj["จัดส่ง"] === 1;
          }
        }
      }
    }
  }
  return false;
}

async function fetchRescueData() {
  const refID = sessionStorage.getItem("refID");

  if (!refID) {
    console.log("❌ ไม่พบ refID ใน sessionStorage");
    return null;
  }

  try {
    // ดึง document หลัก
    const docRef = doc(db, "rescueData", refID);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log("❌ Document ไม่พบใน Firestore");
      return null;
    }

    const mainData = docSnap.data();

    // ดึง checkList
    const checkListRef = collection(docRef, "checkList");
    const checkListSnap = await getDocs(checkListRef);

    const checkListData = checkListSnap.docs.map((d) => ({
      ...d.data(),
    }));
    console.log(checkListData[4]);

    checkListData.pop(); // ตัดตัวสุดท้ายออก

    // ฟังก์ชันเพิ่ม field "จัดส่ง"
    async function markDeliveryStatus(mainData, checkListData) {
      for (const item of mainData._data) {
        const delivered = await findDelivery(item.address, checkListData);
        item["จัดส่ง"] = delivered ? 1 : 0;
      }
    }

    await markDeliveryStatus(mainData, checkListData);

    // ✅ return mainData
    return mainData;
  } catch (error) {
    console.error("🔥 เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
    return null;
  }
}

const paramMapping = {
  param2: {
    // ระดับความเสียหาย
    1: "น้อยกว่า 30%",
    2: "30% -70%",
    3: "มากกว่า 70%",
  },
  param3: {
    // ความสามารถพึ่งพาตนเอง
    1: "จัดหาเองได้",
    2: "จัดหาได้บ้าง",
    3: "ไม่มีทรัพยาร",
  },
  param4: {
    // ความลำบากเข้าถึงพื้นที่
    1: "เข้าถึงได้ปกติ",
    2: "เข้าถึงได้บ้าง",
    3: "เข้าถึงไม่ได้",
  },
  param5: {
    // ใช้พาหนะของ ทอ. เท่านั้น
    1: "ไม่จำเป็น",
    3: "จำเป็น",
  },
  param6: {
    // ระยะเวลาประสบภัย
    1: "น้อยกว่า 24 ชม.",
    2: "24 ชม. - 48 ชม.",
    3: "มากกว่า 48 ชม.",
  },
  param7: {
    // ระดับความรุนแรง
    1: "เสียหายเล็กน้อย",
    2: "เสียหายบางจุด",
    3: "เสียหายทั้งหมด",
  },
  param8: {
    // ความเสี่ยงที่อาจเกิดซ้ำ
    1: "น้อย",
    2: "ปานกลาง",
    3: "มาก",
  },
  vehicle: {
    // ความเสี่ยงที่อาจเกิดซ้ำ
    1: "รถบรรทุก",
    2: "รถยูนิม็อก",
    3: "เรือ",
    4: "เฮลิคอปเตอร์",
  },
  wings: {
    // ความเสี่ยงที่อาจเกิดซ้ำ
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
  },
};

function renderMainTable(mainData) {
  const container = document.getElementById("mainTable");
  if (!container) return;

  const data = mainData._data;
  if (!data || data.length === 0) {
    container.innerHTML = "<p>ไม่มีข้อมูลใน mainData</p>";
    return;
  }

  let html = `
    <table class="main-table">
      <colgroup>
        <col style="width: 1%" />
        <col style="width: 12%" />
        <col style="width: 5%" />
        <col style="width: 5%" />
        <col style="width: 4%" />
        <col style="width: 6%" />
        <col style="width: 6%" />
        <col style="width: 6%" />
        <col style="width: 5%" />
        <col style="width: 7%" />
        <col style="width: 7%" />
        <col style="width: 5%" />
        <col style="width: 5%" />
        <col style="width: 2%" />
      </colgroup>
      <thead>
        <tr>
          <th>ลำดับ</th>
          <th>ชุมชน</th>
          <th>จำนวนผู้ประสบภัย</th>
          <th>จำนวนกลุมเปราะบาง</th>
          <th>ถุงยังชีพ</th>
          <th>ระดับความเสียหาย</th>
          <th>ความสามารถพึ่งพาตนเอง</th>
          <th>ความลำบากเข้าถึงพื้นที่</th>
          <th>ใช้พาหนะของ ทอ.เท่านั้น</th>
          <th>ระยะเวลาประสบภัย</th>
          <th>ระดับความรุนแรง</th>
          <th>ความเสี่ยงที่อาจเกิดซ้ำ</th>
          <th>ยานพาหนะ</th>
          <th>จัดส่ง</th>
         
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach((item, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${item.address ?? "-"}</td>
        <td>${item.victim ?? "-"}</td>
        <td>${item.vulnerable ?? "-"}</td>
        <td>${item.survivalBag ?? "-"}</td>
        <td>${paramMapping.param2[item.parameter[2]] ?? "-"}</td>
        <td>${paramMapping.param3[item.parameter[3]] ?? "-"}</td>
        <td>${paramMapping.param4[item.parameter[4]] ?? "-"}</td>
        <td>${paramMapping.param5[item.parameter[5]] ?? "-"}</td>
        <td>${paramMapping.param6[item.parameter[6]] ?? "-"}</td>
        <td>${paramMapping.param7[item.parameter[7]] ?? "-"}</td>
        <td>${paramMapping.param8[item.parameter[8]] ?? "-"}</td>
        <td>${paramMapping.vehicle[item.vehicle] ?? "-"}</td>
        <td>${item["จัดส่ง"] === 1 ? "✔" : "✘"}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function updateHeader(mainData) {
  const wing = mainData.wing ?? "ไม่ระบุพื้นที่";
  const area = paramMapping.wings[wing];
  const dateRaw = mainData.date ?? ""; // ควรเป็น Timestamp หรือ yyyy-mm-dd

  const areaElem = document.getElementById("areaName");
  const dateElem = document.getElementById("eventDate");

  if (areaElem) areaElem.textContent = area;

  if (dateElem && dateRaw) {
    const date = new Date(dateRaw);
    const formattedDate = date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    dateElem.textContent = formattedDate;
  }
}

(async () => {
  const mainData = await fetchRescueData();
  if (mainData) {
    updateHeader(mainData);
    renderMainTable(mainData);
  }
})();
