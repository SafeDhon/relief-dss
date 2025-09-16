// home2.js

// ข้อมูลชุมชน
const data = [
  { id: 1, name: "ชุมชน 1", lat: 100.5, lon: 50.0 },
  { id: 2, name: "ชุมชน 2", lat: 100.5, lon: 50.0 },
  { id: 3, name: "บ้านหนองน้ำ", lat: 101.2, lon: 50.5 },
  { id: 4, name: "บ้านคลองใหญ่", lat: 102.0, lon: 51.0 },
  { id: 5, name: "ชุมชนตลาด", lat: 103.1, lon: 52.0 },
];

const searchBox = document.getElementById("searchBox");
const addBtn = document.getElementById("addBtn"); // ปุ่มเพิ่ม
const listContainer = document.getElementById("listContainer"); // ลิสต์ที่เพิ่ม
// const placeholder = document.getElementById("placeholder");

// dropdown
const resultList = document.createElement("ul");
resultList.classList.add("dropdown-list");
searchBox.parentNode.style.position = "relative";
searchBox.parentNode.appendChild(resultList);

let currentIndex = -1;
let selectedItem = null; // เก็บค่าที่เลือกตอนนี้
let addedCommunities = [];

// ค้นหา
function searchCommunities(query) {
  resultList.innerHTML = "";
  currentIndex = -1;
  selectedItem = null;

  if (query.trim() === "") {
    resultList.style.display = "none";
    return;
  }

  const results = data.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  if (results.length === 0) {
    resultList.style.display = "none";
  } else {
    resultList.style.display = "block";
    results.forEach((item) => {
      const li = document.createElement("li");
      li.classList.add("dropdown-item");
      li.textContent = item.name;

      li.addEventListener("click", () => {
        selectItem(item);
      });

      resultList.appendChild(li);
    });
  }
}

// เลือก item
function selectItem(item) {
  searchBox.value = item.name;
  selectedItem = item;
  resultList.style.display = "none";
}

// เมื่อพิมพ์
searchBox.addEventListener("input", (e) => {
  searchCommunities(e.target.value);
});

// ปิด dropdown
document.addEventListener("click", (e) => {
  if (e.target !== searchBox) {
    resultList.style.display = "none";
  }
});

// สร้าง placeholder แสดงก่อนเพิ่มชุมชน
function showPlaceholder() {
  listContainer.innerHTML = "";
  const ph = document.createElement("li");
  ph.id = "placeholder";
  ph.style.color = "#888";
  ph.style.textAlign = "center";
  ph.style.padding = "8px";
  ph.textContent = "กรุณาเพิ่มชุมชน";
  listContainer.appendChild(ph);
}

function updateIndices() {
  const items = listContainer.querySelectorAll("li span");
  items.forEach((span, i) => {
    // ถ้า li เป็น placeholder → ข้าม
    if (span.parentNode.id === "placeholder") return;

    // ตัดเลขเก่าออก แล้วใส่เลขใหม่
    const text = span.textContent.split(". ").slice(1).join(". ");
    span.textContent = `${i + 1}. ${text}`;
  });
}

// เริ่มต้นให้แสดง placeholder
showPlaceholder();

// เพิ่มรายการเมื่อกดปุ่ม
addBtn.addEventListener("click", () => {
  if (selectedItem) {
    const existingItems = addedCommunities.map((item) => item.name);

    if (existingItems.includes(selectedItem.name)) {
      alert("ชุมชนนี้ถูกเพิ่มแล้ว!");
      searchBox.value = "";
      resultList.style.display = "none";
      selectedItem = null;
      return;
    }

    // ถ้ามี placeholder → ลบ
    const ph = document.getElementById("placeholder");
    if (ph) ph.remove();

    const index = listContainer.children.length + 1;

    // สร้าง li
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "4px 0";
    li.style.marginBottom = "12px";

    const span = document.createElement("span");
    span.textContent = `${index}. ${selectedItem.name}`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "x";
    delBtn.classList.add("delete-btn");
    delBtn.dataset.name = selectedItem.name;
    delBtn.style.background = "#ff4d4f";
    delBtn.style.color = "#fff";
    delBtn.style.border = "none";
    delBtn.style.borderRadius = "50%";
    delBtn.style.width = "20px";
    delBtn.style.height = "20px";
    delBtn.style.cursor = "pointer";

    delBtn.addEventListener("click", () => {
      li.remove(); // ลบ li จากหน้า
      updateIndices(); // ปรับเลขลำดับ

      // ลบจาก array addedCommunities โดยใช้ dataset ของปุ่ม
      addedCommunities = addedCommunities.filter(
        (c) => c.name !== delBtn.dataset.name
      );

      // ถ้าไม่มีชุมชนเหลือ → แสดง placeholder
      if (listContainer.querySelectorAll("li").length === 0) showPlaceholder();
    });

    li.appendChild(span);
    li.appendChild(delBtn);
    listContainer.appendChild(li);

    // เพิ่มใน array
    addedCommunities.push(selectedItem);

    // reset search
    searchBox.value = "";
    selectedItem = null;
  }
});

// ปุ่มต่อไป
const nextBtn = document.getElementById("nextBtn");
nextBtn.addEventListener("click", () => {
  console.log("ชุมชนที่เพิ่ม:", addedCommunities);
});
