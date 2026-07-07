import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  addDoc,
  doc,
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
    window.location.href = "../pages/login.html";
  } else {
    console.log("ผู้ใช้เข้าสู่ระบบแล้ว:", user.email);
  }
});

const searchOptions = document.getElementById("searchOptions");
const listContainer = document.getElementById("listContainer");

async function loadCommunities() {
  const selectedWing = Number(searchOptions.value);
  if (!selectedWing) return;

  listContainer.innerHTML = "";

  try {
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

    let counter = 1;
    sortedResults.forEach((docSnap) => {
      const data = docSnap.data();
      const li = document.createElement("li");

      const nameSpan = document.createElement("span");
      nameSpan.textContent = `${counter}. ${data.community}`;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.title = "ลบชุมชน";
      deleteBtn.innerHTML = "🗑";

      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const confirmed = confirm(`ยืนยันการลบ "${data.community}" ?`);
        if (!confirmed) return;
        try {
          await deleteDoc(doc(db, "communities", docSnap.id));
          li.remove();
        } catch (err) {
          console.error("ลบไม่สำเร็จ:", err);
          alert("เกิดข้อผิดพลาด ลบข้อมูลไม่สำเร็จ");
        }
      });

      li.dataset.community = data.community;
      li.dataset.lat = data.latitude;
      li.dataset.lng = data.longitude;

      li.addEventListener("click", () => {
        li.classList.toggle("selected");
      });

      li.appendChild(nameSpan);
      li.appendChild(deleteBtn);
      listContainer.appendChild(li);
      counter++;
    });
  } catch (e) {
    console.error("Error getting documents: ", e);
    const li = document.createElement("li");
    li.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    li.style.color = "red";
    listContainer.appendChild(li);
  }
}

searchOptions.addEventListener("change", loadCommunities);

// ─── ปุ่มต่อไป ───────────────────────────────────────────────────────────────
const nextBtn = document.getElementById("nextBtn");

nextBtn.addEventListener("click", () => {
  const selectedWing = Number(searchOptions.value);

  if (!selectedWing) {
    alert("กรุณาเลือกกองบินก่อน");
    return;
  }

  const selectedItems = Array.from(
    listContainer.querySelectorAll("li.selected")
  );

  if (selectedItems.length === 0) {
    alert("กรุณาเลือกชุมชนอย่างน้อย 1 แห่ง");
    return;
  }

  const communityArray = selectedItems.map((li, index) => ({
    id: index + 1,
    address: li.dataset.community,
    latitude: Number(li.dataset.lat),
    longitude: Number(li.dataset.lng),
  }));

  sessionStorage.setItem("selectedWing", JSON.stringify(selectedWing));
  sessionStorage.setItem("communityArray", JSON.stringify(communityArray));

  window.location.href = "../pages/fillin.html";
});

// ─── Modal เพิ่มชุมชน ────────────────────────────────────────────────────────
const modal = document.getElementById("addCommunityModal");
let mapView = null;
let graphicsLayer = null;
let selectedLat = null;
let selectedLng = null;

document.getElementById("addCommunityBtn").addEventListener("click", () => {
  const wing = Number(searchOptions.value);
  if (!wing) {
    alert("กรุณาเลือกกองบินก่อน");
    return;
  }

  // รีเซ็ตฟอร์ม
  document.getElementById("newCommunityName").value = "";
  document.getElementById("coordDisplay").textContent =
    "ค้นหาหรือคลิกบนแผนที่เพื่อเลือกตำแหน่ง";
  selectedLat = null;
  selectedLng = null;

  modal.classList.add("active");

  if (!mapView) {
    initMap();
  } else {
    // รีเซ็ต pin เดิมออก
    graphicsLayer.removeAll();
  }
});

document.getElementById("cancelAddBtn").addEventListener("click", () => {
  modal.classList.remove("active");
});

// ปิด modal เมื่อคลิกพื้นหลัง
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("active");
});

function initMap() {
  require(
    [
      "esri/Map",
      "esri/views/MapView",
      "esri/widgets/Search",
      "esri/widgets/BasemapGallery",
      "esri/widgets/Expand",
      "esri/Graphic",
      "esri/layers/GraphicsLayer",
    ],
    (Map, MapView, Search, BasemapGallery, Expand, Graphic, GraphicsLayer) => {
      const map = new Map({ basemap: "topo-vector" });
      graphicsLayer = new GraphicsLayer();
      map.add(graphicsLayer);

      mapView = new MapView({
        container: "mapModalDiv",
        map,
        center: [100.5018, 13.7563],
        zoom: 6,
      });

      const searchWidget = new Search({
        view: mapView,
        resultGraphicEnabled: false,
      });
      mapView.ui.add(searchWidget, "top-right");

      const basemapGallery = new BasemapGallery({ view: mapView });
      const bgExpand = new Expand({
        view: mapView,
        content: basemapGallery,
        expandTooltip: "เลือกแผนที่",
      });
      mapView.ui.add(bgExpand, "bottom-right");

      // เลือกตำแหน่งจาก Search
      searchWidget.on("select-result", (event) => {
        const geom = event.result?.feature?.geometry;
        if (geom) placePin(geom.longitude, geom.latitude, Graphic);
      });

      // คลิกบนแผนที่
      mapView.on("click", (event) => {
        const { longitude, latitude } = event.mapPoint;
        placePin(longitude, latitude, Graphic);
      });
    }
  );
}

function placePin(lng, lat, Graphic) {
  selectedLng = lng;
  selectedLat = lat;

  graphicsLayer.removeAll();
  graphicsLayer.add(
    new Graphic({
      geometry: { type: "point", longitude: lng, latitude: lat },
      symbol: {
        type: "simple-marker",
        color: [220, 38, 38],
        size: 12,
        outline: { color: [255, 255, 255], width: 2 },
      },
    })
  );

  document.getElementById(
    "coordDisplay"
  ).textContent = `ละติจูด: ${lat.toFixed(6)}, ลองจิจูด: ${lng.toFixed(6)}`;
}

// บันทึก
document.getElementById("saveAddBtn").addEventListener("click", async () => {
  const name = document.getElementById("newCommunityName").value.trim();
  const wing = Number(searchOptions.value);

  if (!name) {
    alert("กรุณากรอกชื่อชุมชน");
    return;
  }
  if (selectedLat === null || selectedLng === null) {
    alert("กรุณาเลือกตำแหน่งบนแผนที่");
    return;
  }

  try {
    await addDoc(collection(db, "communities"), {
      wing,
      community: name,
      latitude: selectedLat,
      longitude: selectedLng,
      createdAt: new Date().toISOString(),
    });
    alert(`เพิ่มชุมชน "${name}" สำเร็จ`);
    modal.classList.remove("active");
    loadCommunities();
  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาด: " + err.message);
  }
});

// ─── กลับหน้าแรก ─────────────────────────────────────────────────────────────
const backBtn = document.getElementById("backBtn");
backBtn.addEventListener("click", () => {
  window.location.href = "home.html";
});
