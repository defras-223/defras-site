const DB = "https://" + "boltalka-16a6a-default-rtdb" + ".europe-west1." + "firebasedatabase.app/messages";
let sec = localStorage.getItem("defras_admin_secret") || "";

const f = document.querySelector(".bottom-bar");
const mIn = document.getElementById("msgInput");
const nIn = document.createElement("input");
nIn.placeholder = "Nick";
nIn.maxLength = 16;
nIn.style.cssText = "max-width:95px;border-right:2px solid #555;margin-right:8px;padding-right:6px;color:#eb6a28;";
f.insertBefore(nIn, mIn);

const modal = document.createElement("div");
modal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,10,10,0.85);z-index:120;align-items:center;justify-content:center;";
modal.innerHTML = `<form id="admF" style="background:#eb6a28;border:4px solid #0a0a0a;padding:20px;width:300px;display:flex;flex-direction:column;gap:10px;">
  <div style="font-weight:bold;font-size:15px;">// DEFrAS Admin Auth</div>
  <input type="password" id="admP" placeholder="Secret key..." style="background:#0a0a0a;color:#f4f4f4;border:none;padding:8px;font-family:inherit;font-weight:bold;" />
  <div style="display:flex;gap:8px;">
    <button type="submit" style="flex:1;background:#cf1717;color:#0a0a0a;border:2px solid #0a0a0a;padding:6px;font-weight:bold;cursor:pointer;">Login</button>
    <button type="button" id="admC" style="background:#9a9a9a;color:#0a0a0a;border:2px solid #0a0a0a;padding:6px;font-weight:bold;cursor:pointer;">Cancel</button>
  </div>
</form>`;
document.body.appendChild(modal);

document.getElementById("admC").onclick = () => { modal.style.display = "none"; };
document.getElementById("admF").onsubmit = (e) => {
  e.preventDefault();
  const v = document.getElementById("admP").value.trim();
  if (!v) return;
  sec = v; localStorage.setItem("defras_admin_secret", v);
  document.getElementById("admP").value = ""; modal.style.display = "none";
  load();
};

document.querySelector(".logo-slot").ondblclick = () => {
  if (sec && confirm("Exit DEFrAS Admin mode?")) {
    sec = ""; localStorage.removeItem("defras_admin_secret"); load();
  } else if (!sec) { modal.style.display = "flex"; document.getElementById("admP").focus(); }
};

window.delMsg = async (id) => {
  if (!sec) return;
  await fetch(DB + "/" + id + ".json", { method: "DELETE" });
  load();
};

async function load() {
  try {
    const r = await fetch(DB + ".json");
    const data = await r.json();
    const list = document.getElementById("chatList");
    list.innerHTML = `<div><div class="msg-header"><div class="msg-avatar">⊗</div><span>1×T^1 :</span></div><div class="msg-text">Hey!</div></div><div><div class="msg-header"><div class="msg-avatar">⊘</div><span>11×1 :</span></div><div class="msg-text">Hello</div></div>`;
    if (!data || data.error) return;
    Object.entries(data).forEach(([id, m]) => {
      const d = document.createElement("div");
      const a = (m.author || "guest").replace(/</g, "&lt;");
      const b = m.isAdmin ? `<span style="color:#cf1717;background:#0a0a0a;padding:0 4px;">DEFrAS ★</span>` : `<span>${a}</span>`;
      const x = sec ? `<button onclick="delMsg('${id}')" style="margin-left:auto;background:#0a0a0a;color:#cf1717;border:none;cursor:pointer;font-weight:bold;padding:0 5px;">×</button>` : "";
      d.innerHTML = `<div class="msg-header"><div class="msg-avatar">${m.isAdmin ? "★" : "◈"}</div>${b} :${x}</div><div class="msg-text"></div>`;
      d.querySelector(".msg-text").textContent = m.text;
      list.appendChild(d);
    });
  } catch (e) {}
}

f.onsubmit = async (e) => {
  e.preventDefault();
  const v = mIn.value.trim();
  if (!v) return;
  mIn.value = "";
  const author = nIn.value.trim() || ("anon#" + Math.floor(100 + Math.random() * 899));
  const r = await fetch(DB + ".json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, text: v, isAdmin: Boolean(sec), secret: sec || "", ts: Date.now() })
  });
  if (!r.ok) alert("Firebase rejected: " + r.status);
  load();
};

load();
setInterval(load, 4000);
