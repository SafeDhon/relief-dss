require([
  "esri/widgets/Search",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
], function (Search, GraphicsLayer, Graphic) {
  const resultsOutput = document.getElementById("resultsOutput");
  const errorMessage = document.getElementById("errorMessage");
  const calculateButton = document.getElementById("addButton");
  const nextButton = document.getElementById("nextBtn");
  const searchOptions = document.getElementById("searchOptions");

  const selectedLocations = [];

  const searchWidget = new Search({
    includeDefaultSources: true,
    container: "searchWidgetDiv",
    showSourceSelect: false,
    sources: [
      {
        url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
        singleLineFieldName: "SingleLine",
        outFields: ["Match_addr", "City", "Region", "District", "Score"],
        name: "ArcGIS World Geocoding Service",
        placeholder: "ค้นหาที่อยู่และเลือกรายการ",
        maxResults: 6,
        maxSuggestions: 6,
        minSuggestCharacters: 3,
      },
    ],
  });

  searchWidget.on("select-result", (event) => {
    errorMessage.textContent = "";

    const selectedResult = event.result;

    if (selectedResult) {
      const attributes = selectedResult.feature.attributes;
      const geometry = selectedResult.feature.geometry;

      tempSelectedLocation = {
        address: attributes.Match_addr || "",
        longitude: geometry ? geometry.longitude : null,
        latitude: geometry ? geometry.latitude : null,
      };

      // ไม่เพิ่มเข้า selectedLocations ทันที
    } else {
      errorMessage.textContent = "ไม่สามารถดึงข้อมูลสถานที่ที่เลือกได้";
      tempSelectedLocation = null;
    }
  });

  searchWidget.on("clear", () => {
    displaySelectedLocations(selectedLocations);
    errorMessage.textContent = "";
  });

  searchWidget.on("search-error", (event) => {
    console.error("Search Widget Error:", event.error);
    errorMessage.textContent = `เกิดข้อผิดพลาดในการค้นหา: ${
      event.error.message || "Unknown error"
    }`;
  });

  function displaySelectedLocations(locationsArray) {
    resultsOutput.innerHTML = "";

    if (locationsArray.length > 0) {
      locationsArray.forEach((item, index) => {
        const resultDiv = document.createElement("div");
        resultDiv.classList.add("result-item");
        resultDiv.innerHTML = `
          <div class="result-info">
            ${
              item.address
                ? `<p><strong>${index + 1}.</strong> ${item.address}</p>`
                : ""
            }
            ${
              item.latitude !== null && item.longitude !== null
                ? `<p><strong>พิกัด:</strong> ${item.latitude.toFixed(
                    6
                  )}, ${item.longitude.toFixed(6)}</p>`
                : ""
            }
          </div>
          <div class="result-actions">
            <button class="delete-button" data-index="${index}">ลบ</button>
          </div>
        `;
        resultsOutput.appendChild(resultDiv);
      });
    } else {
      resultsOutput.innerHTML =
        '<p class="no-results">ยังไม่มีสถานที่ถูกเลือก</p>';
    }
  }

  resultsOutput.addEventListener("click", (event) => {
    if (event.target.classList.contains("delete-button")) {
      const indexToDelete = parseInt(event.target.dataset.index);
      if (
        !isNaN(indexToDelete) &&
        indexToDelete >= 0 &&
        indexToDelete < selectedLocations.length
      ) {
        selectedLocations.splice(indexToDelete, 1);
        displaySelectedLocations(selectedLocations);
      }
    }
  });

  calculateButton.addEventListener("click", () => {
    if (tempSelectedLocation) {
      selectedLocations.push(tempSelectedLocation);
      displaySelectedLocations(selectedLocations);
      tempSelectedLocation = null;
      searchWidget.clear(); // ล้างช่อง search หลังเพิ่มแล้ว
    } else {
      errorMessage.textContent = "กรุณาเลือกสถานที่จากช่องค้นหาก่อนกดเพิ่ม";
    }
  });

  nextButton.addEventListener("click", () => {
    errorMessage.textContent = "";

    if (searchOptions.value === "") {
      errorMessage.textContent = "กรุณาเลือกกองบินก่อนดำเนินการต่อ";
      return;
    }
    if (selectedLocations.length === 0) {
      errorMessage.textContent =
        "กรุณาเลือกสถานที่อย่างน้อยหนึ่งแห่งก่อนดำเนินการต่อ";
      return;
    }
    // const selectedLocations_test = [
    //   { address: "ชุมชน 1", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 2", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 3", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 4", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 5", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 6", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 7", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 8", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 9", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 10", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 11", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 12", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 13", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 14", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 15", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 16", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 17", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 18", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 19", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 20", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 21", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 22", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 23", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 24", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 25", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 26", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 27", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 28", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 29", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 30", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 31", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 32", longitude: 100, latitude: 100 },
    //   { address: "ชุมชน 33", longitude: 100, latitude: 100 },
    // ];

    // const selectedLocationsWithId = selectedLocations_test.map((location, index) => {
    //   return { ...location, id: index + 1 };
    // });

    const dataToPass = JSON.stringify(selectedLocations);
    sessionStorage.setItem("selectedLocationsData", dataToPass);
    sessionStorage.setItem("selectedWing", searchOptions.value);
    console.log(selectedLocations);
    // window.location.href = "fillin.html";
  });
});
