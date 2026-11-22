const DB_URL = "https://" + "boltalka-16a6a-default-rtdb" + ".europe-west1." + "firebasedatabase.app/messages";
let adminSecret = localStorage.getItem("defras_admin_secret") || "";

// Добавляем поле выбора Nick слева от Text...|
const form = document.querySelector(".bottom-bar");
const msgInput = document.getElementById("msgInput");
const nickInput = document.createElement("input");
nickInput.type = "text";
nickInput.id = "nickInput";
nickInput.placeholder = "Nick";
nickInput.maxLength = 16;
nickInput.style.cssText = "max-width:95px;border-right:2px solid #555;margin-right:8px;padding-right:6px;color:#eb6a28;";
form.insertBefore(nickInput, msgInput);

// Создаем скрытое окно входа админа
const modal = document.createElement("div");
modal.id = "adminModal";
modal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,10,10,0.85);z-index:120;align-items:center;justify-content:center;";
modal.innerHTML = `<form id="adminForm" style="background:#eb6a28;border:4px solid #0a0a0a;padding:20px;width:300px;display:flex;flex-direction:column;gap:10px;">
  <div style="font-weight:bold;font-size:15px;">// DEFrAS Admin Auth</div>
  <input type="password" id="adminPassInput" placeholder="Secret key..." style="background:#0a0a0a;color:#f4f4f4;border:none;padding:8px;font-family:inherit;font-weight:bold;" />
  <div style="display:flex;gap:8px;">
    <button type="submit" style="flex:1;background:#cf1717;color:#0a0a0a;border:2px solid #0a0a0a;padding:6px;font-weight:bold;cursor:pointer;">Login</button>
    <button type="button" id="adminCancel" style="background:#9a9a9a;color:#0a0a0a;border:2px solid #0a0a0a;padding:6px;font-weight:bold;cursor:pointer;">Cancel</button>
  </div>
</form>`;
document.body.appendChild(modal);

document.getElementById("adminCancel").onclick = () => { modal.style.display = "none"; };
document.getElementById("adminForm").onsubmit = (e) => {
  e.preventDefault();
  const val = document.getElementById("adminPassInput").value.trim();
  if (!val) return;
  adminSecret = val;
  localStorage.setItem("defras_admin_secret", val);
  document.getElementById("adminPassInput").value = "";
  modal.style.display = "none";
  loadMessages();
};

document.querySelector(".logo-slot").addEventListener("dblclick", () => {
  if (adminSecret) {
    if (confirm("Exit DEFrAS Admin mode?")) {
      adminSecret = "";
      localStorage.removeItem("defras_admin_secret");
      loadMessages();
    }
  } else {
    modal.style.display = "flex";
    document.getElementById("adminPassInput").focus();
  }
});

window.deleteMsg = async function(id) {
  if (!adminSecret) return;
  await fetch(`${DB_URL}/${id}.json`, { method: "DELETE" });
  loadMessages();
};

async function loadMessages() {
  try {
    const res = await fetch(`${DB_URL}.json`);
    const data = await res.json();
    const list = document.getElementById("chatList");
    list.innerHTML = `
      <div><div class="msg-header"><div class="msg-avatar">⊗</div><span>1×T^1 :</span></div><div class="msg-text">Hey!</div></div>
      <div><div class="msg-header"><div class="msg-avatar">⊘</div><span>11×1 :</span></div><div class="msg-text">Hello</div></div>
    `;
    if (!data || data.error) return;
    Object.entries(data).forEach(([id, m]) => {
      const d = document.createElement("div");
      const safeAuthor = (m.author || "guest").replace(/</g, "&lt;");
      const badge = m.isAdmin ? `<span style="color:#cf1717;background:#0a0a0a;padding:0 4px;">DEFrAS ★</span>` : `<span>${safeAuthor}</span>`;
      const delBtn = adminSecret ? `<button onclick="deleteMsg('${id}')" style="margin-left:auto;background:#0a0a0a;color:#cf1717;border:none;cursor:pointer;font-weight:bold;padding:0 5px;">×</button>` : "";
      d.innerHTML = `<div class="msg-header"><div class="msg-avatar">${m.isAdmin ? "★" : "◈"}</div>${badge} :${delBtn}</div><div class="msg-text"></div>`;
      d.querySelector(".msg-text").textContent = m.text;
      list.appendChild(d);
    });
  } catch (err) { console.error(err); }
}

window.sendMsg = async function(e) {
  e.preventDefault();
  const v = msgInput.value.trim();
  if (!v) return;
  msgInput.value = "";
  const author = nickInput.value.trim() || ("anon#" + Math.floor(100 + Math.random() * 899));
  const res = await fetch(`${DB_URL}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, text: v, isAdmin: Boolean(adminSecret), secret: adminSecret || "", ts: Date.now() })
  });
  if (!res.ok) {
    alert("Error sending (check Admin key)");
    if (adminSecret) { adminSecret = ""; localStorage.removeItem("defras_admin_secret"); }
  }
  loadMessages();
};

loadMessages();
setInterval(loadMessages, 4000);

form.removeAttribute("onsubmit");
form.addEventListener("submit", window.sendMsg);

form.querySelector("button").onclick = window.sendMsg;

// Железно перехватываем форму и отключаем перезагрузку страницы
const oldForm = document.querySelector(".bottom-bar");
const cleanForm = oldForm.cloneNode(true);
oldForm.parentNode.replaceChild(cleanForm, oldForm);
cleanForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const mIn = cleanForm.querySelector("#msgInput");
  const nIn = cleanForm.querySelector("#nickInput");
  const v = mIn.value.trim();
  if (!v) return;
  mIn.value = "";
  const author = nIn.value.trim() || ("anon#" + Math.floor(100 + Math.random() * 899));
  const res = await fetch(DB_URL + ".json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, text: v, isAdmin: Boolean(adminSecret), secret: adminSecret || "", ts: Date.now() })
  });
  if (!res.ok) alert("Ошибка отправки (проверь ключ админа или Rules)");
  loadMessages();
});
