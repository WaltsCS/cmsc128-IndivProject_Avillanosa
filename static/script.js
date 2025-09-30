const listEl = document.getElementById("list");
const form = document.getElementById("taskForm");

// --- Load tasks ---
async function load() {
  const res = await fetch("/api/tasks");
  const tasks = await res.json();
  listEl.innerHTML = "";

  tasks.forEach(task => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="${task.completed ? 'done' : ''}">
        ${task.title} (Due: ${task.due_date || '—'} ${task.due_time || ''})
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

// --- Add ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const due_date = document.getElementById("due_date").value.trim();
  const due_time = document.getElementById("due_time").value.trim();

  if (!title) return alert("Task title required");

  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, due_date, due_time }),
  });

  form.reset();
  load();
});

// --- Toggle Done ---
async function toggleDone(id, currentStatus) {
  const newStatus = currentStatus ? 0 : 1; // flip status
  await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: newStatus })
  });
  load(); // reload tasks
}


// --- Edit ---
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

// --- Delete ---
async function deleteTask(id) {
  if (confirm("Delete this task?")) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    load();
  }
}

// Initial load
load();
