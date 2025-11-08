const listEl = document.getElementById("list");
const form = document.getElementById("taskForm");

let lastDeleted = null;
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const undoBtn = document.getElementById("undo-btn");

//Auth gate on To-Do page
(async () => {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (!data.user) {
      // not logged in → go back to Accounts page
      window.location.href = "/accounts";
    } else {
      console.log(`✅ Logged in as ${data.user.username}`);
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "/accounts";
  }
})();

//Load tasks
async function load() {
  const res = await fetch("/api/tasks");
  const tasks = await res.json();
  listEl.innerHTML = "";

  tasks.forEach(task => {
    const li = document.createElement("li");

    let color = "gray";
    if (task.priority === "High") color = "red";
    else if (task.priority === "Mid") color = "orange";
    else if (task.priority === "Low") color = "green";

    li.innerHTML = `
      <span class="${task.completed ? 'done' : ''}">
        ${task.title} (Due: ${task.due_date || '—'} ${task.due_time || ''})
        <span class="priority ${task.priority}">${task.priority}</span>
      </span>
      <button onclick="toggleDone(${task.id}, ${task.completed})">
        ${task.completed ? "Undo" : "Done"}
      </button>
      <button onclick="editTask(${task.id}, '${task.title}', '${task.due_date || ''}', '${task.due_time || ''}')">Edit</button>
      <button onclick="deleteTask(${task.id})">Delete</button>
    `;
    listEl.appendChild(li);
  });
}

//Add
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const due_date = document.getElementById("due_date").value.trim();
  const due_time = document.getElementById("due_time").value.trim();
  const priority = document.getElementById("priority").value;

  if (!title) return alert("Task title required");

  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, due_date, due_time, priority }),
  });

  form.reset();
  load();
});


//Toggle Done
async function toggleDone(id, currentStatus) {
  const newStatus = currentStatus ? 0 : 1; //flip status
  await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: newStatus })
  });
  load(); //reload tasks
}


//Edit
function editTask(id, title, due_date, due_time) {
  const newTitle = prompt("Edit title:", title);
  if (newTitle === null) return;

  const newDate = prompt("Edit due date:", due_date);
  const newTime = prompt("Edit due time:", due_time);

  fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle, due_date: newDate, due_time: newTime, completed: 0 }),
  }).then(load);
}

//Delete(with Toast + Undo)
async function deleteTask(id) {
  if (confirm("Delete this task?")) {
    // get task before deleting
    const res = await fetch("/api/tasks");
    const tasks = await res.json();
    const task = tasks.find(t => t.id === id);

    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    load();

    showToast("Task deleted.", task);
  }
}

//Show Toast
function showToast(message, task) {
  toastMsg.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");

  lastDeleted = task; //save last deleted

  //Auto-hide after 5s
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300); //wait for fade-out
    lastDeleted = null;
  }, 5000);
}

//Undo
undoBtn.addEventListener("click", async () => {
  if (lastDeleted) {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: lastDeleted.title,
        due_date: lastDeleted.due_date,
        due_time: lastDeleted.due_time
      }),
    });
    load();
    lastDeleted = null;
    toast.classList.add("hidden");
  }
});

//Init load
load();
