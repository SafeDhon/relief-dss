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
const params = new URLSearchParams(window.location.search);

const refID = params.get("refID");

async function fetchRescueData() {
  // const refID = sessionStorage.getItem("refID");

  if (!refID) return;

  try {
    const docRef = doc(db, "rescueData", refID);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const data = docSnap.data();

    // ✅ set default date
    if (data.date) {
      document.getElementById("eventDate").value = data.date;
      console.log("📅 โหลดวันที่:", data.date);
    }

    const checkListRef = collection(docRef, "checkList");
    const checkListSnap = await getDocs(checkListRef);
    const checkListData = checkListSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    renderTables(checkListData, refID);
  } catch (err) {
    console.error(err);
  }
}

function renderTables(data, refID) {
  const tableContainer = document.getElementById("checkListTable");
  if (!tableContainer) return;

  if (data.length === 0) {
    tableContainer.innerHTML = "<p>ไม่มีข้อมูลใน checkList</p>";
    return;
  }

  tableContainer.innerHTML = "";
  // แผนที่ id -> name
  const vehicleMap = {};
  _vehicles.forEach((v) => {
    vehicleMap[v.id] = v.name;
  });

  data.forEach((item) => {
    let vehicleName = vehicleMap[item.id] ?? `ID: ${item.id}`;
    let html = `<h2>📌 ขนส่งถุงยังชีพโดย ${vehicleName}</h2>`;

    // เช็คว่า item มี field ที่เป็น array หรือไม่
    const arrayKeys = Object.keys(item).filter(
      (k) => k !== "id" && Array.isArray(item[k])
    );

    if (arrayKeys.length === 0) {
      html += `<p>ไม่มีการจัดส่งด้วยพาหนะชนิดนี้</p>`;
    } else {
      arrayKeys
        .sort((a, b) => Number(a) - Number(b))
        .forEach((key) => {
          const dataObjs = item[key];
          if (dataObjs.length > 0) {
            const orderedHeaders = [
              "ลำดับ",
              "ต้นทาง",
              "ปลายทาง",
              "ระยะทาง (กม.)",
              "ระยะทางสะสม (กม.)",
              "จัดส่ง",
            ];

            html += `
          <table class="delivery-table" />
            <thead>
              <tr>
                ${orderedHeaders.map((h) => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${dataObjs
                .map(
                  (o, index) => `
                <tr>
                  ${orderedHeaders
                    .map((h) => {
                      if (h === "จัดส่ง") {
                        // ❌ แถวสุดท้ายของแต่ละตาราง จะไม่ให้ติ๊ก
                        if (index === dataObjs.length - 1) {
                          return `<td>-</td>`; // หรือจะใส่ข้อความ "สรุป" ก็ได้
                        }

                        return `<td>
        <input type="checkbox" 
          data-docid="${item.id}" 
          data-field="${key}" 
          data-index="${index}" 
          ${o[h] === 1 ? "checked" : ""}>
      </td>`;
                      }
                      return `<td>${o[h] ?? "-"}</td>`;
                    })
                    .join("")}

                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <br/>
        `;
          } else {
            html += `<p>ไม่มีการจัดส่งด้วยพาหนะชนิดนี้</p>`;
          }
        });
    }

    tableContainer.innerHTML += html;
  });

  // event listener
  tableContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", async (e) => {
      const checkbox = e.target;
      const docID = checkbox.dataset.docid;
      const field = checkbox.dataset.field;
      const index = parseInt(checkbox.dataset.index);
      const newValue = checkbox.checked ? 1 : 0;

      try {
        // ใช้ refID ที่ส่งมาแทน docID ใน rescueData
        const docRef = doc(db, "rescueData", refID, "checkList", docID);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.warn("❌ ไม่พบ document:", docID);
          return;
        }

        const dataObj = docSnap.data();

        const arr = [...dataObj[field]];
        arr[index] = { ...arr[index], จัดส่ง: newValue };

        await updateDoc(docRef, {
          [field]: arr,
        });

        console.log(
          `✅ อัปเดตจัดส่ง docID:${docID}, field:${field}, index:${index} = ${newValue}`
        );
      } catch (err) {
        console.error("🔥 Error updating Firestore:", err);
      }
    });
  });
}

document.getElementById("eventDate").addEventListener("change", async (e) => {
  const selectedDate = e.target.value;
  const refID = sessionStorage.getItem("refID");
  if (!refID) return;

  try {
    const docRef = doc(db, "rescueData", refID);
    await updateDoc(docRef, { date: selectedDate });

    console.log("✅ อัปเดตวันที่สำเร็จ:", selectedDate);
  } catch (err) {
    console.error("🔥 อัปเดตวันที่ล้มเหลว:", err);
  }
});

async function validateDateBeforeGo() {
  if (!refID) {
    alert("ไม่พบข้อมูลอ้างอิง (refID)");
    return false;
  }

  const docRef = doc(db, "rescueData", refID);
  const docSnap = await getDoc(docRef);

  const data = docSnap.data();
  if (!data.date || data.date.trim() === "") {
    alert("กรุณาเลือกวันที่ก่อนดำเนินการต่อ");
    return false;
  }

  return true;
}

document.getElementById("conclu-button").addEventListener("click", async () => {
  const ok = await validateDateBeforeGo();
  if (!ok) return;

  window.location.href = `../pages/conclusion.html?refID=${encodeURIComponent(
    refID
  )}`;
});


const historyBtn = document.getElementById("historyBtn");
historyBtn.addEventListener("click", () => {
  window.location.href = "../pages/history.html";
});

fetchRescueData();
