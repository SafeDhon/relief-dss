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
  var table = document.getElementById("myTable");
  for (var i = 0; i < data.length; i++) {
    var row = `<tr>
                  <td>${data[i].id}.</td>
                  <td>${data[i].address}</td>
                <td>${data[i].latitude.toFixed(8)}</td>
                <td>${data[i].longitude.toFixed(8)}</td>
                <td>${data[i].victim}</td>
                  <td><input type="number" class="number-input" min="0" autocomplete="new-password" value="${Math.ceil(
                    data[i].victim / 4
                  )}"></td>  
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
butt.addEventListener("click", function () {
  var _bagVehicle = getTableData();
  var _data = getData();

  if (_data.length === _bagVehicle.length) {
    for (let i = 0; i < _data.length; i++) {
      _data[i].survivalBag = _bagVehicle[i].survivalBag;
      _data[i].vehicle = _bagVehicle[i].vehicle;
    }
  } else {
    console.warn(
      "จำนวนสมาชิกใน _data และ _bagVehicle ไม่เท่ากัน อาจเกิดข้อผิดพลาดในการรวมข้อมูล"
    );
  }

  var _originWing = getOrigin();
  sessionStorage.setItem("originWing", _originWing);
  sessionStorage.setItem("addedData", JSON.stringify(_data));

  window.location.href = "sorted.html";
});
