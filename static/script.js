/* DOM ELEMENTS */
const listEl = document.getElementById("list");
const form = document.getElementById("taskForm");

const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const toastUndo = document.getElementById("toast-undo");

const deleteModal = document.getElementById("deleteModal");
const deleteConfirmBtn = document.getElementById("deleteConfirm");
const deleteCancelBtn = document.getElementById("deleteCancel");

const collabListContainer = document.getElementById("collabListContainer");
const myTasksBtn = document.getElementById("myTasksBtn");
const newCollabBtn = document.getElementById("newCollabBtn");

const collabMeta = document.getElementById("collab-meta");
const collabOwnerLabel = document.getElementById("collab-owner-label");
const inviteForm = document.getElementById("inviteForm");
const inviteUsernameInput = document.getElementById("invite-username");

/* NEW: create-collab modal elements */
const newCollabModal = document.getElementById("newCollabModal");
const newCollabNameInput = document.getElementById("new-collab-name");
const newCollabCreateBtn = document.getElementById("newCollabCreate");
const newCollabCancelBtn = document.getElementById("newCollabCancel");

let currentUser = null;
let listsData = null;
let currentListId = null;
let currentListType = "personal";
let lastDeleted = null;
let pendingDeleteID = null;

/* AUTH GATE */
(async () => {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (!data.user) {
      window.location.href = "/accounts#login";
      return;
    }
    currentUser = data.user;
    document.getElementById(
      "welcome-user"
    ).textContent = `👋 Hello, ${currentUser.name}!`;
    // load lists & tasks
    await loadLists();
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "/accounts";
  }
})();

/* NAVBAR */
document.getElementById("profileBtn").onclick = () =>
  (window.location.href = "/accounts#profile");

document.getElementById("logoutBtn").onclick = async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/accounts#login";
};

/* FLATPICKR */
flatpickr(".flatpickr-date", {
  dateFormat: "Y-m-d",
  allowInput: true,
});

flatpickr(".flatpickr-time", {
  enableTime: true,
  noCalendar: true,
  dateFormat: "H:i",
  time_24hr: true,
  allowInput: true,
});

/* TOAST SYSTEM */
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

/* LISTS */

async function loadLists() {
  const res = await fetch("/api/lists");
  if (!res.ok) {
    console.error("Failed to load lists");
    return;
  }
  listsData = await res.json();

  renderSidebar();

  // set default current list to personal if none
  if (!currentListId && listsData.personal) {
    currentListId = listsData.personal.id;
    currentListType = "personal";
  }

  updateListHeader();
  updateCollabMeta();
  highlightActiveListButton();
  await loadTasks();
}

function renderSidebar() {
  collabListContainer.innerHTML = "";

  // personal list button already exists (#myTasksBtn)

  // owned collab
  (listsData.collab_owned || []).forEach((lst) => {
    const btn = document.createElement("button");
    btn.className = "sidebar-item";
    btn.dataset.listId = lst.id;
    btn.dataset.listType = "collab";
    btn.dataset.owner = "true";
    btn.textContent = lst.name + " (Owner)";
    collabListContainer.appendChild(btn);
  });

  // member collab
  (listsData.collab_member || []).forEach((lst) => {
    const btn = document.createElement("button");
    btn.className = "sidebar-item";
    btn.dataset.listId = lst.id;
    btn.dataset.listType = "collab";
    btn.dataset.owner = "false";
    btn.textContent = `${lst.name} (${lst.owner_name})`;
    collabListContainer.appendChild(btn);
  });
}

function highlightActiveListButton() {
  document
    .querySelectorAll(".sidebar-item")
    .forEach((btn) => btn.classList.remove("sidebar-item-active"));

  if (currentListType === "personal" && listsData.personal) {
    myTasksBtn.classList.add("sidebar-item-active");
    return;
  }

  if (currentListType === "collab") {
    const match = document.querySelector(
      `.sidebar-item[data-list-id="${currentListId}"]`
    );
    if (match) match.classList.add("sidebar-item-active");
  }
}

function updateListHeader() {
  const label = document.getElementById("current-list-name");
  if (currentListType === "personal") {
    label.textContent = "Viewing: My Tasks (personal)";
    return;
  }

  let list = null;
  (listsData.collab_owned || []).forEach((l) => {
    if (l.id === currentListId) list = l;
  });
  (listsData.collab_member || []).forEach((l) => {
    if (l.id === currentListId) list = l;
  });

  if (!list) {
    label.textContent = "";
    return;
  }

  if (list.is_owner) {
    label.textContent = `Viewing: ${list.name} (you are owner)`;
  } else if (list.owner_name) {
    label.textContent = `Viewing: ${list.name} (owned by ${list.owner_name})`;
  } else {
    label.textContent = `Viewing: ${list.name}`;
  }
}

function getCurrentListMeta() {
  if (currentListType === "personal") {
    return {
      id: listsData.personal.id,
      type: "personal",
      is_owner: true,
      owner_name: currentUser.name,
    };
  }

  let list = null;
  (listsData.collab_owned || []).forEach((l) => {
    if (l.id === currentListId) list = l;
  });
  (listsData.collab_member || []).forEach((l) => {
    if (l.id === currentListId) list = l;
  });
  return list;
}

function updateCollabMeta() {
  const meta = getCurrentListMeta();
  if (!meta || meta.type === "personal") {
    collabMeta.classList.add("hidden");
    return;
  }

  // collab list
  if (meta.is_owner) {
    collabOwnerLabel.textContent = "You are the owner of this list.";
    inviteForm.classList.remove("hidden");
  } else {
    collabOwnerLabel.textContent = `Owner: ${meta.owner_name}`;
    inviteForm.classList.add("hidden");
  }
  collabMeta.classList.remove("hidden");
}

/* SIDEBAR CLICK HANDLER */

myTasksBtn.addEventListener("click", async () => {
  if (!listsData.personal) return;
  currentListId = listsData.personal.id;
  currentListType = "personal";
  highlightActiveListButton();
  updateListHeader();
  updateCollabMeta();
  await loadTasks();
});

collabListContainer.addEventListener("click", async (e) => {
  const btn = e.target.closest(".sidebar-item");
  if (!btn) return;

  const id = parseInt(btn.dataset.listId, 10);
  const type = btn.dataset.listType;

  currentListId = id;
  currentListType = type;

  highlightActiveListButton();
  updateListHeader();
  updateCollabMeta();
  await loadTasks();
});

/* NEW: open create-collab modal */
newCollabBtn.addEventListener("click", () => {
  newCollabNameInput.value = "";
  newCollabModal.classList.add("show");
  newCollabModal.classList.remove("hidden");
  newCollabNameInput.focus();
});

/* NEW: cancel create-collab */
newCollabCancelBtn.addEventListener("click", () => {
  newCollabModal.classList.remove("show");
  setTimeout(() => newCollabModal.classList.add("hidden"), 200);
});

/* NEW: create collaborative list from modal */
newCollabCreateBtn.addEventListener("click", async () => {
  const name = newCollabNameInput.value.trim();
  if (!name) {
    showToast("List name required", "error");
    return;
  }

  const res = await fetch("/api/collab_lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showToast(data.error || "Failed to create list", "error");
    return;
  }

  const created = await res.json();
  showToast("Collaborative list created!", "success");
  currentListId = created.id;
  currentListType = "collab";

  // close modal
  newCollabModal.classList.remove("show");
  setTimeout(() => newCollabModal.classList.add("hidden"), 200);

  await loadLists();
});

/* INVITE FORM (ONLY OWNER CAN INVITE) */
inviteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = inviteUsernameInput.value.trim();
  if (!username) return;

  const listMeta = getCurrentListMeta();
  if (!listMeta || listMeta.type !== "collab" || !listMeta.is_owner) {
    showToast("You are not allowed to invite on this list.", "error");
    return;
  }

  const res = await fetch(`/api/collab_lists/${currentListId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    showToast(data.error || "Failed to invite user", "error");
    return;
  }

  showToast("User invited successfully!", "success");
  inviteUsernameInput.value = "";
});

/* LOAD TASKS FOR CURRENT LIST */
async function loadTasks() {
  if (!currentListId) return;

  const res = await fetch(`/api/tasks?list_id=${currentListId}`);
  if (!res.ok) {
    listEl.innerHTML = "<li>Error loading tasks.</li>";
    return;
  }

  const tasks = await res.json();
  listEl.innerHTML = "";

  tasks.forEach((task) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span class="${task.completed ? "done" : ""}">
        ${task.title}
        (Due: ${task.due_date || "—"} ${task.due_time || ""})
        <span class="priority ${task.priority}">${task.priority}</span>
      </span>

      <div>
        <button onclick="toggleDone(${task.id}, ${task.completed})">
          ${task.completed ? "Undo" : "Done"}
        </button>

        <button onclick="editTask(${task.id},
          '${task.title.replace(/'/g, "\\'")}',
          '${task.due_date || ""}',
          '${task.due_time || ""}',
          '${task.priority || "Low"}'
        )">Edit</button>

        <button onclick="deleteTask(${task.id})">Delete</button>
      </div>
    `;

    listEl.appendChild(li);
  });
}

/* ADD TASK */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const due_date = document.getElementById("due_date").value.trim() || null;
  const due_time = document.getElementById("due_time").value.trim() || null;
  const priority = document.getElementById("priority").value;

  if (!title) {
    showToast("Task title required", "error");
    return;
  }

  const body = {
    title,
    due_date,
    due_time,
    priority,
    list_id: currentListId,
  };

  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showToast(data.error || "Failed to add task.", "error");
    return;
  }

  showToast("Task added!", "success");
  form.reset();
  await loadTasks();
});

/* TOGGLE DONE */
async function toggleDone(id, done) {
  await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: done ? 0 : 1 }),
  });
  await loadTasks();
}

/* EDIT TASK */
function editTask(id, title, due_date, due_time, priority) {
  const newTitle = prompt("Edit title:", title);
  if (newTitle === null) return;

  const newDate = prompt("Edit due date:", due_date || "");
  if (newDate === null) return;

  const newTime = prompt("Edit due time:", due_time || "");
  if (newTime === null) return;

  const resPriority = prompt(
    "Edit priority (Low/Mid/High):",
    priority || "Low"
  );
  if (resPriority === null) return;

  fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: newTitle,
      due_date: newDate || null,
      due_time: newTime || null,
      priority: resPriority || "Low",
    }),
  }).then(async () => {
    showToast("Task updated!", "success");
    await loadTasks();
  });
}

/* DELETE, MODAL, AND UNDO */
async function deleteTask(id) {
  pendingDeleteID = id;
  deleteModal.classList.add("show");
  deleteModal.classList.remove("hidden");
}

deleteCancelBtn.onclick = () => {
  pendingDeleteID = null;
  deleteModal.classList.remove("show");
  setTimeout(() => deleteModal.classList.add("hidden"), 200);
};

deleteConfirmBtn.onclick = async () => {
  if (!pendingDeleteID) return;

  const res = await fetch(`/api/tasks?list_id=${currentListId}`);
  const tasks = await res.json();
  lastDeleted = tasks.find((t) => t.id === pendingDeleteID);

  await fetch(`/api/tasks/${pendingDeleteID}`, { method: "DELETE" });
  await loadTasks();

  showToast("Task deleted.", "error", true);

  deleteModal.classList.remove("show");
  pendingDeleteID = null;
};

/* UNDO DELETE */
toastUndo.onclick = async () => {
  if (!lastDeleted) return;

  const body = {
    title: lastDeleted.title,
    due_date: lastDeleted.due_date,
    due_time: lastDeleted.due_time,
    priority: lastDeleted.priority,
    list_id: currentListId,
  };

  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  showToast("Delete undone!", "success");
  lastDeleted = null;
  await loadTasks();
};

// loadTasks called from loadLists() once everything is set up
