import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

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

const searchOptions = document.getElementById("searchOptions");
const listContainer = document.getElementById("listContainer");

searchOptions.addEventListener("change", async () => {
  const selectedWing = Number(searchOptions.value); // แปลงเป็น number

  // 🔹 ตรวจสอบว่ามีการเลือกกองบิน
  if (!selectedWing) return;

  // 🔹 ล้าง list ก่อน
  listContainer.innerHTML = "";

  try {
    // สร้าง query
    const q = query(
      collection(db, "communities"),
      where("wing", "==", selectedWing)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      const li = document.createElement("li");
      li.textContent = "ไม่มีชุมชนในกองบินนี้";
      li.style.color = "#888";
      listContainer.appendChild(li);
      return;
    }

    const sortedResults = querySnapshot.docs.sort((a, b) =>
      a.data().community.localeCompare(b.data().community, "th")
    );

    let counter = 1; // ตัวนับเริ่มจาก 1
    sortedResults.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = data.community;
      checkbox.id = "chk_" + doc.id;

      // ✅ เก็บ lat/long ไว้ใน dataset
      checkbox.dataset.lat = data.latitude;
      checkbox.dataset.lng = data.longitude;

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = `${counter}. ${data.community}`;
      label.style.marginLeft = "8px";

      li.appendChild(checkbox);
      li.appendChild(label);
      listContainer.appendChild(li);

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          li.classList.add("selected");
        } else {
          li.classList.remove("selected");
        }
      });

      counter++;
    });
  } catch (e) {
    console.error("Error getting documents: ", e);
    const li = document.createElement("li");
    li.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    li.style.color = "red";
    listContainer.appendChild(li);
  }
});

const nextBtn = document.getElementById("nextBtn");

nextBtn.addEventListener("click", () => {
  const selectedWing = Number(searchOptions.value);

  // ✅ ยังไม่ได้เลือกกองบิน
  if (!selectedWing) {
    alert("กรุณาเลือกกองบินก่อน");
    return;
  }

  // ✅ หา checkbox ที่ถูกเลือกทั้งหมด
  const checkedCommunities = Array.from(
    listContainer.querySelectorAll("input[type=checkbox]:checked")
  );

  if (checkedCommunities.length === 0) {
    alert("กรุณาเลือกชุมชนอย่างน้อย 1 แห่ง");
    return;
  }

  // ✅ สร้าง array ชุมชน
  const communityArray = checkedCommunities.map((chk, index) => ({
    id: index + 1, // running index
    address: chk.value,
    latitude: Number(chk.dataset.lat),
    longitude: Number(chk.dataset.lng),
  }));

  sessionStorage.setItem("selectedWing", JSON.stringify(selectedWing));
  sessionStorage.setItem("communityArray", JSON.stringify(communityArray));

  console.log("กองบินที่เลือก:", selectedWing);
  console.log("ชุมชนที่เลือก:", communityArray);

  window.location.href = "../pages/fillin.html";
});

// ปุ่มไปหน้า History
const historyBtn = document.getElementById("historyBtn");
historyBtn.addEventListener("click", () => {
  window.location.href = "../pages/history.html";
});

const communityBtn = document.getElementById("communityBtn");
communityBtn.addEventListener("click", () => {
  window.location.href = "../pages/community.html";
});
