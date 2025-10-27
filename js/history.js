document.addEventListener("DOMContentLoaded", () => {
  const homeBtn = document.getElementById("homeBtn");

  if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      sessionStorage.clear(); // ✅ ล้างข้อมูลทั้งหมด
      window.location.href = "../pages/home.html"; // ✅ กลับหน้า Home
    });
  }
});
