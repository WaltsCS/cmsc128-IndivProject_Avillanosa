/* DOM Elements */
const listEl = document.getElementById("list");
const form = document.getElementById("taskForm");

let lastDeleted = null;
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const toastUndo = document.getElementById("toast-undo");

// Modal elements
const deleteModal = document.getElementById("deleteModal");
const deleteConfirmBtn = document.getElementById("deleteConfirm");
const deleteCancelBtn = document.getElementById("deleteCancel");
let pendingDeleteID = null;

//Auth gate on To-Do page
(async () => {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (!data.user) {
      window.location.href = "/accounts#login";
    } else {
      document.getElementById("welcome-user").textContent =
        `👋 Hello, ${data.user.name}!`;
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "/accounts";
  }
})();

/* Navbar Actions */
document.getElementById("profileBtn").onclick = () =>
  window.location.href = "/accounts#profile";

document.getElementById("logoutBtn").onclick = async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/accounts#login";
};



/* Flatpickr Init */
flatpickr(".flatpickr-date", {
  dateFormat: "Y-m-d",
  allowInput: true
});

flatpickr(".flatpickr-time", {
  enableTime: true,
  noCalendar: true,
  dateFormat: "H:i",
  time_24hr: true,
  allowInput: true
});


/* Toast system */
function showToast(message, type = "info", undo = false) {
  toastMsg.textContent = message;

  toastMsg.className = "";  
  if (type === "success") toastMsg.classList.add("toast-msg-success");
  if (type === "error") toastMsg.classList.add("toast-msg-error");

  toastUndo.classList.toggle("hidden", !undo);

  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("show"), 50);

  setTimeout(() => hideToast(), 4500);
}

function hideToast() {
  toast.classList.remove("show");
  setTimeout(() => toast.classList.add("hidden"), 350);
}


//Load tasks
async function load() {
  const res = await fetch("/api/tasks");
  const tasks = await res.json();
  listEl.innerHTML = "";

  tasks.forEach(task => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span class="${task.completed ? "done" : ""}">
        ${(task.title)} 
        (Due: ${task.due_date || "—"} ${task.due_time || ""})
        <span class="priority ${task.priority}">${task.priority}</span>
      </span>

      <button onclick="toggleDone(${task.id}, ${task.completed})">
        ${task.completed ? "Undo" : "Done"}
      </button>

      <button onclick="editTask(${task.id},
        '${task.title}',
        '${task.due_date}',
        '${task.due_time}'
      )">Edit</button>

      <button onclick="deleteTask(${task.id})">Delete</button>
    `;

    listEl.appendChild(li);
  });
}



//Add Task
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const due_date = document.getElementById("due_date").value.trim();
  const due_time = document.getElementById("due_time").value.trim();
  const priority = document.getElementById("priority").value;

  if (!title) {
    showToast("Task title required", "error");
    return;
  }

  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, due_date, due_time, priority }),
  });

  showToast("Task added!", "success");
  form.reset();
  await load();
});


//Toggle Done
async function toggleDone(id, done) {
  await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: done ? 0 : 1 })
  });
  await load(); //reload tasks
}


//Edit Task w/ confirmation toast
function editTask(id, title, due_date, due_time) {
  const newTitle = prompt("Edit title:", title);
  if (newTitle === null) return;

  const newDate = prompt("Edit due date:", due_date);
  const newTime = prompt("Edit due time:", due_time);

  fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      title: newTitle, 
      due_date: newDate, 
      due_time: newTime, 
      completed: 0 
    })
  }).then(() => {
    showToast("Task updated!", "success");
    load();
  });
}

//Delete(with Toast + Undo)
async function deleteTask(id) {
  pendingDeleteID = id;
  deleteModal.classList.add("show");
}

deleteCancelBtn.onclick = () => {
  pendingDeleteID = null;
  deleteModal.classList.remove("show");
};

deleteConfirmBtn.onclick = async () => {
  if (!pendingDeleteID) return;

  const res = await fetch("/api/tasks");
  const tasks = await res.json();
  lastDeleted = tasks.find(t => t.id === pendingDeleteID);

  await fetch(`/api/tasks/${pendingDeleteID}`, { method: "DELETE" });
  await load();

  showToast("Task deleted.", "error", true);

  deleteModal.classList.remove("show");
  pendingDeleteID = null;
};


//Undo Delete
toastUndo.onclick = async () => {
  if (!lastDeleted) return;

  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lastDeleted)
  });

  showToast("Delete undone!", "success");
  lastDeleted = null;
  await load();
};

//Init task list
load();
