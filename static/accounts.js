//Elements
const signupSection = document.getElementById("signup-section");
const loginSection = document.getElementById("login-section");
const profileSection = document.getElementById("profile-section");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");

const profileName = document.getElementById("profile-name");
const profileUsername = document.getElementById("profile-username");


//switch between forms
document.getElementById("show-login").addEventListener("click", () => {
    signupSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
});

document.getElementById("show-signup").addEventListener("click", () => {
    loginSection.classList.add("hidden");
    signupSection.classList.remove("hidden");
});


//Signup
signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("su_username").value.trim();
    const password = document.getElementById("su_password").value.trim();
    const name = document.getElementById("su_name").value.trim();

    if (!username || !password || !name) {
        alert("Please fill out all fields.");
        return;
    }

    const res = await fetch("/api/signup", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username, password, name}),
    });

    if (res.ok) {
        alert("Account created! You can now log in.");
        signupSection.classList.add("hidden");
        loginSection.classList.remove("hidden");
    } else {
        const data = await res.json();
        alert("Error: " + data.error);
  }
});


//Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("li_username").value.trim();
  const password = document.getElementById("li_password").value.trim();

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (res.ok) {
    //Save user in localStorage
    localStorage.setItem("user", JSON.stringify(data.user));
    showProfile(data.user);
  } else {
    alert("Login failed: " + data.error);
  }
});


//Show Profile
function showProfile(user) {
  signupSection.classList.add("hidden");
  loginSection.classList.add("hidden");
  profileSection.classList.remove("hidden");

  profileName.textContent = user.name;
  profileUsername.textContent = user.username;
}

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