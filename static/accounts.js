//Elements
const signupSection = document.getElementById("signup-section");
const loginSection = document.getElementById("login-section");
const profileSection = document.getElementById("profile-section");
const recoverySection = document.getElementById("recovery-section");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const recoveryForm = document.getElementById("recoveryForm");

const profileName = document.getElementById("profile-name");
const profileUsername = document.getElementById("profile-username");

const signupError = document.getElementById("signup-error");
const loginError = document.getElementById("login-error");
const recoveryError = document.getElementById("recovery-error");

const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const updateError = document.getElementById("update-error");



//toast func
function showToast(message, duration = 4000) {
  toastMsg.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300); // wait for fade-out
  }, duration);
}

//switch between forms
document.getElementById("show-login").addEventListener("click", () => {
    signupSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    signupError.classList.add("hidden");
});

document.getElementById("show-signup").addEventListener("click", () => {
    loginSection.classList.add("hidden");
    signupSection.classList.remove("hidden");
    loginError.classList.add("hidden");
});

document.getElementById("forgot-password-link").addEventListener("click", () => {
  loginSection.classList.add("hidden");
  recoverySection.classList.remove("hidden");
  loginError.classList.add("hidden");
});

document.getElementById("back-to-login").addEventListener("click", () => {
  recoverySection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  recoveryError.classList.add("hidden");
});


//Signup
signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("su_username").value.trim();
    const password = document.getElementById("su_password").value.trim();
    const name = document.getElementById("su_name").value.trim();

    const errorBox = document.getElementById("signup-error");

    if (!username || !password || !name) {
      errorBox.textContent = "Please fill out all fields.";
      errorBox.classList.remove("hidden");
      setTimeout(() => errorBox.classList.add("hidden"), 10000);
      return;
    }

    const res = await fetch("/api/signup", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username, password, name}),
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || "Error creating account.";
      errorBox.classList.remove("hidden");
      setTimeout(() => errorBox.classList.add("hidden"), 10000);
      return;
    }

    //Success
    showToast("Account created successfully! You can now log in.");

    signupSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    signupForm.reset();
    signupError.classList.add("hidden");
});


//Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("li_username").value.trim();
  const password = document.getElementById("li_password").value.trim();

  if (!username || !password) {
    loginError.textContent = "Please fill out all fields.";
    loginError.classList.remove("hidden");
    return;
  }

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    loginError.textContent = data.error || "Invalid username or password.";
    loginError.classList.remove("hidden");
    loginError.style.animation = "none";
    loginError.offsetHeight; // reflow for shake effect
    loginError.style.animation = "shake 0.3s ease";
    setTimeout(() => loginError.classList.add("hidden"), 4000);
    return;
  }
  //Success
  localStorage.setItem("user", JSON.stringify(data.user));
  showProfile(data.user);
});


//Show Profile
function showProfile(user) {
  signupSection.classList.add("hidden");
  loginSection.classList.add("hidden");
  profileSection.classList.remove("hidden");

  profileName.textContent = user.name;
  profileUsername.textContent = user.username;

  showToast(`👋 Welcome back, ${user.name}!`);
}

//Update Profile
updateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem("user"));
  const name = document.getElementById("update_name").value.trim();
  const username = document.getElementById("update_username").value.trim();
  const password = document.getElementById("update_password").value.trim();

  if (!name && !username && !password) {
    updateError.textContent = "Enter at least one field to update.";
    updateError.classList.remove("hidden");
    return;
  }

  const res = await fetch(`/api/update_user/${user.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    updateError.textContent = data.error || "Update failed.";
    updateError.classList.remove("hidden");
    setTimeout(() => updateError.classList.add("hidden"), 4000);
    return;
  }

  localStorage.setItem("user", JSON.stringify(data.user));
  showProfile(data.user);
  showToast("✅ Profile updated successfully!");
  updateForm.reset();
});

//Recover Password
recoveryForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("recovery_username").value.trim();
  const new_password = document.getElementById("new_password").value.trim();

  if (!username || !new_password) {
    recoveryError.textContent = "Please fill out all fields.";
    recoveryError.classList.remove("hidden");
    return;
  }

  const res = await fetch("/api/recover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, new_password }),
  });

  const data = await res.json();

  if (!res.ok) {
    recoveryError.textContent = data.error || "Password reset failed.";
    recoveryError.classList.remove("hidden");
    setTimeout(() => recoveryError.classList.add("hidden"), 4000);
    return;
  }

  showToast("✅ Password updated successfully! You can now log in.");
  recoverySection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  recoveryForm.reset();
});


//Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("user");
  profileSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
});

//Data persists on refresh
window.addEventListener("load", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    showProfile(user);
  }
});