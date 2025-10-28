import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// ✅ ตั้งค่า Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB9NIxqa9__0x9JSZplX2PS6ozqyRUPAQQ",
  authDomain: "relief-dss.firebaseapp.com",
  projectId: "relief-dss",
  storageBucket: "relief-dss.firebasestorage.app",
  messagingSenderId: "678196707176",
  appId: "1:678196707176:web:b24a49511e2674f1d1a0dd",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ เมื่อ DOM โหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const errorMsg = document.getElementById("errorMsg");

  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const _email = email + "@nkrafa.com";

    if (!email || !password) {
      errorMsg.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
      return;
    }

    try {
      // ✅ ตั้งค่าให้เป็น session เท่านั้น
      await setPersistence(auth, browserSessionPersistence);

      // ✅ ล็อกอิน
      const userCredential = await signInWithEmailAndPassword(
        auth,
        _email,
        password
      );
      const user = userCredential.user;

      console.log("เข้าสู่ระบบสำเร็จ:", user.email);

      // ✅ เก็บข้อมูล user ไว้ใน sessionStorage
      sessionStorage.setItem("userEmail", user.email);

      // ✅ ไปหน้า Home
      window.location.href = "../pages/home.html";
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      switch (error.code) {
        case "auth/invalid-email":
          errorMsg.textContent = "รูปแบบอีเมลไม่ถูกต้อง";
          break;
        case "auth/user-not-found":
          errorMsg.textContent = "ไม่พบบัญชีผู้ใช้";
          break;
        case "auth/wrong-password":
          errorMsg.textContent = "รหัสผ่านไม่ถูกต้อง";
          break;
        default:
          errorMsg.textContent = "ไม่สามารถเข้าสู่ระบบได้";
      }
    }
  });
});
