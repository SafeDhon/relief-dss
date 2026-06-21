function getData() {
  var addedDataJson = sessionStorage.getItem("addedData");
  let addedData = null;
  if (addedDataJson) {
    try {
      addedData = JSON.parse(addedDataJson);
    } catch (e) {
      console.error("Error parsing sortedData from sessionStorage:", e);
    }
  }

  if (addedData) {
    console.log("ข้อมูล Sorted ที่ได้รับ (Array of Objects):", addedData);
    return addedData;
  } else {
    console.log("ไม่พบข้อมูลที่ส่งมา หรือเกิดข้อผิดพลาดในการดึงข้อมูล.");
    return null;
  }
}

function getOrigin() {
  const selectedWing = parseInt(sessionStorage.getItem("originData"), 10);
  return selectedWing;
}

function getRefID() {
  const refID = sessionStorage.getItem("refID");
  return refID;
}

function prepairData(data) {
  const wing = getOrigin();
  const wingData = wings.find((w) => w.id === wing);
  const points = [];
  if (wingData) {
    points.push({
      id: 1,
      address: `กองบิน ${wingData.id}`,
      lat: wingData.latitude,
      long: wingData.longitude,
      victim: 0,
      bags: 0,
    });
  } else {
    console.log("ไม่พบกองบินที่เลือก");
  }
  for (let i = 0; i < data.length; i++) {
    points.push({
      id: i + 2,
      address: data[i].address,
      lat: data[i].latitude,
      long: data[i].longitude,
      victim: data[i].victim,
      bags: data[i].survivalBag,
    });
  }
  return points;
}

console.log(getData());

const communities = getData();

const vehicles = _vehicles;

const communityTableContainer = document.getElementById(
  "community-table-container"
);
const navButtons = document.querySelectorAll(".nav-button");

let currentDisplayedCommunities = [];
let _vehicleCode = "1";

function splitCommunitiesByCapacity(communities, capacity) {
  const result = [];
  communities.forEach((c) => {
    let remaining = c.survivalBag;
    let parts = Math.ceil(remaining / capacity); // ✅ จำนวน part ทั้งหมด
    let part = 1;

    while (remaining > 0) {
      const take = Math.min(remaining, capacity);

      result.push({
        ...c,
        address: parts > 1 ? `${c.address} (รอบที่ ${part})` : c.address, // ✅ ใส่ label เฉพาะถ้ามีหลาย part
        survivalBag: take,
        victim: Math.round((c.victim * take) / c.survivalBag),
      });

      remaining -= take;
      part++;
    }
  });
  return result;
}

// แสดงกลุ่มของชุมชนตาม capacity
function displayGroupedTable(filteredCommunities, vehicle) {
  const capacity = vehicle.capacity;
  const groups = [];
  let currentGroup = [];
  let currentSum = 0;

  filteredCommunities.forEach((community) => {
    if (currentSum + community.survivalBag > capacity) {
      groups.push(currentGroup);
      currentGroup = [];
      currentSum = 0;
    }
    currentGroup.push(community);
    currentSum += community.survivalBag;
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  groups.forEach((group, groupIndex) => {
    const groupTitle = document.createElement("h4");
    groupTitle.textContent = `รอบที่ ${groupIndex + 1
      } (ไม่เกิน ${capacity} ถุง)`;
    communityTableContainer.appendChild(groupTitle);

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const tfoot = document.createElement("tfoot");

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th>ลำดับ</th>
      <th>ที่อยู่</th>
      <th>ละติจูด</th>
      <th>ลองจิจูด</th>
      <th>ผู้ประสบภัย (คน)</th>
      <th>ถุงยังชีพ (ถุง)</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    group.forEach((community, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}.</td>
        <td>${community.address}</td>
        <td>${community.latitude.toFixed(8)}</td>
        <td>${community.longitude.toFixed(8)}</td>
        <td>${community.victim}</td>
        <td>${community.survivalBag}</td>
      `;
      tbody.appendChild(row);
    });

    const footerRow = document.createElement("tr");
    const footerCell = document.createElement("td");
    footerCell.colSpan = 6;
    footerCell.style.textAlign = "right";

    footerRow.appendChild(footerCell);
    tfoot.appendChild(footerRow);

    table.appendChild(tbody);
    table.appendChild(tfoot);
    communityTableContainer.appendChild(table);
  });
}

// แสดงข้อมูลตาม vehicle หรือ all
function displayCommunities(filterVehicleCode) {
  communityTableContainer.innerHTML = "";
  _vehicleCode = filterVehicleCode;

  if (filterVehicleCode === "all") {
    currentDisplayedCommunities = communities;
    displayAllCommunitiesInOneTable(communities);
  } else {
    const filtered = communities.filter(
      (community) => community.vehicle === parseInt(filterVehicleCode)
    );
    currentDisplayedCommunities = filtered;

    const vehicle = vehicles.find((v) => v.id === parseInt(filterVehicleCode));
    if (!vehicle) {
      communityTableContainer.innerHTML =
        '<p style="text-align: center; color: red;">ไม่พบข้อมูล vehicle</p>';
      return;
    }

    if (filtered.length === 0) {
      communityTableContainer.innerHTML =
        '<p style="text-align: center; color: #666;">ไม่พบข้อมูลชุมชนสำหรับยานพาหนะประเภทนี้</p>';
      return;
    }

    const splitted = splitCommunitiesByCapacity(filtered, vehicle.capacity);
    displayGroupedTable(splitted, vehicle);

    // displayGroupedTable(filtered, vehicle);
  }
}

function displayAllCommunitiesInOneTable(communityList) {
  const groupTitle = document.createElement("h4");
  groupTitle.textContent = `📋 ข้อมูลชุมชนทั้งหมด (${communityList.length} รายการ)`;
  communityTableContainer.appendChild(groupTitle);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const tfoot = document.createElement("tfoot");

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th>ลำดับ</th>
    <th>ที่อยู่</th>
    <th>ละติจูด</th>
    <th>ลองจิจูด</th>
    <th>ผู้ประสบภัย (คน)</th>
    <th>ถุงยังชีพ (ถุง)</th>
    <th>พาหนะ</th>
  `;
  thead.appendChild(headerRow);
  table.appendChild(thead);

  communityList.forEach((community, index) => {
    const vehicleName =
      vehicles.find((v) => v.id === community.vehicle)?.name || "ไม่ทราบ";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}.</td>
      <td>${community.address}</td>
      <td>${community.latitude.toFixed(8)}</td>
      <td>${community.longitude.toFixed(8)}</td>
      <td>${community.victim}</td>
      <td>${community.survivalBag}</td>
      <td>${vehicleName}</td>
    `;
    tbody.appendChild(row);
  });

  const footerRow = document.createElement("tr");
  const footerCell = document.createElement("td");
  footerCell.colSpan = 7;
  footerCell.style.textAlign = "right";

  const btn = document.createElement("button");
  btn.textContent = "คำนวณเส้นทาง";
  btn.classList.add("route-button");

  btn.addEventListener("click", () => {
    const routeData = buildRouteData(communities, vehicles);
    console.log("Route Data:", routeData);

    let totalTabs = 0; // ✅ เก็บจำนวนแท็บทั้งหมดที่จะเปิด
    Object.entries(routeData).forEach(([vehicleId, groups]) => {
      if (vehicleId === "wing") return;
      totalTabs += groups.length;
    });

    let opened = 0; // ✅ ตัวนับแท็บที่เปิดแล้ว
    let check_array = [];

    Object.entries(routeData).forEach(([vehicleId, groups]) => {
      if (vehicleId === "wing") return;
      const ref = getRefID();
      check_array.push(groups);

      groups.forEach((arr, index) => {
        const data = encodeURIComponent(JSON.stringify(arr));
        const wing = routeData.wing;

        const url =
          vehicleId === "4"
            ? `../pages/route2.html?wing=${wing}&vehicle=${vehicleId}&group=${index}&ref=${ref}&data=${data}`
            : vehicleId === "3"
              ? `../pages/route3.html?wing=${wing}&vehicle=${vehicleId}&group=${index}&ref=${ref}&data=${data}`
              : `../pages/route1.html?wing=${wing}&vehicle=${vehicleId}&group=${index}&ref=${ref}&data=${data}`;

        setTimeout(() => {
          window.open(url, "_blank");

          opened++;
          if (opened === totalTabs) {
            setTimeout(() => {
              const ref = getRefID();
              sessionStorage.setItem("refID", ref);
              sessionStorage.setItem("groupCheck", JSON.stringify(check_array));
              window.location.href = "../pages/list.html";
            }, 500);
          }
        }, index * 500);
      });
    });
  });

  footerCell.appendChild(btn);

  footerRow.appendChild(footerCell);
  tfoot.appendChild(footerRow);

  table.appendChild(tbody);
  table.appendChild(tfoot);
  communityTableContainer.appendChild(table);
}

function splitAndGroupCommunities(communities, capacity) {
  const allParts = [];

  // 1) แตกชุมชนที่เกิน capacity
  communities.forEach((c) => {
    let remaining = c.survivalBag;
    let parts = Math.ceil(remaining / capacity);
    let part = 1;

    while (remaining > 0) {
      const take = Math.min(remaining, capacity);
      allParts.push({
        ...c,
        address: parts > 1 ? `${c.address} (รอบที่ ${part})` : c.address,
        survivalBag: take,
        victim: Math.round((c.victim * take) / c.survivalBag),
      });
      remaining -= take;
      part++;
    }
  });

  // 2) จัดกลุ่มให้รวมกันได้ไม่เกิน capacity
  const groups = [];
  let currentGroup = [];
  let currentSum = 0;

  allParts.forEach((part) => {
    if (currentSum + part.survivalBag > capacity) {
      groups.push(currentGroup);
      currentGroup = [];
      currentSum = 0;
    }
    currentGroup.push(part);
    currentSum += part.survivalBag;
  });

  if (currentGroup.length > 0) groups.push(currentGroup);
  return groups;
}

function buildRouteData(communities, vehicles) {
  const wing = getOrigin();
  const wingData = wings.find((w) => w.id === wing);

  const result = {
    wing: wingData?.id || null, // จะได้ 21, 23 ฯลฯ
  };

  vehicles.forEach((vehicle) => {
    const filtered = communities.filter((c) => c.vehicle === vehicle.id);
    if (filtered.length > 0) {
      // 🔹 ใช้ฟังก์ชันใหม่ที่ทำทั้ง split + group
      const groups = splitAndGroupCommunities(filtered, vehicle.capacity);

      const simplified = groups.map((group) =>
        group.map((c) => ({
          id: c.id,
          address: c.address,
          lat: c.latitude,
          long: c.longitude,
          victim: c.victim,
          bags: c.survivalBag,
        }))
      );

      result[vehicle.id] = simplified;
    } else {
      result[vehicle.id] = [];
    }
  });

  return result;
}


navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    navButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const code = button.dataset.vehicleCode;
    displayCommunities(code);
  });
});


displayCommunities("all");

const historyBtn = document.getElementById("historyBtn");
historyBtn.addEventListener("click", () => {
  window.location.href = "../pages/history.html";
});
