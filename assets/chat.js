const BASE = "https://" + "boltalka-16a6a-default-rtdb" + ".europe-west1." + "firebasedatabase.app";
const DB = BASE + "/messages";
let sec = localStorage.getItem("defras_admin_secret") || "";
let allEntries = [], lastSentText = "", lastSentTime = 0, failCount = 0;

const f = document.querySelector(".bottom-bar");
const mIn = document.getElementById("msgInput");
const nIn = document.createElement("input");
nIn.placeholder = "Nick"; nIn.maxLength = 16;
nIn.style.cssText = "max-width:95px;border-right:2px solid #555;margin-right:8px;padding-right:6px;color:#eb6a28;";
f.insertBefore(nIn, mIn);

// Кнопка ARCHIVE [+] вверху чата
const chatPanel = document.querySelector(".chat-panel");
const archBtn = document.createElement("button");
archBtn.type = "button";
archBtn.textContent = "ARCHIVE [+]";
archBtn.style.cssText = "width:100%;background:#0a0a0a;color:#f4f4f4;border:2px solid #cf1717;padding:5px 8px;margin-bottom:12px;font-family:inherit;font-weight:bold;font-size:12px;cursor:pointer;text-align:right;";
chatPanel.insertBefore(archBtn, chatPanel.firstChild);

// Модалка архива всего чата
const archModal = document.createElement("div");
archModal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,10,10,0.9);z-index:115;align-items:center;justify-content:center;padding:16px;";
archModal.innerHTML = `<div style="background:#d45b1e;border:4px solid #0a0a0a;width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;padding:16px;gap:10px;">
  <div style="display:flex;justify-content:space-between;align-items:center;background:#0a0a0a;color:#f4f4f4;padding:8px 12px;font-weight:bold;">
    <span id="archCount">// CHAT ARCHIVE (0)</span>
    <button id="archClose" style="background:#cf1717;color:#0a0a0a;border:none;padding:2px 8px;font-weight:bold;cursor:pointer;">X</button>
  </div>
  <input type="text" id="archSearch" placeholder="Search messages or nick..." style="background:#0a0a0a;color:#f4f4f4;border:2px solid #0a0a0a;padding:8px;font-family:inherit;font-weight:bold;" />
  <div id="archList" style="overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding-right:4px;"></div>
</div>`;
document.body.appendChild(archModal);
archBtn.onclick = () => { archModal.style.display = "flex"; renderArchive(); };
document.getElementById("archClose").onclick = () => { archModal.style.display = "none"; };
document.getElementById("archSearch").oninput = renderArchive;

// Модалка входа админа
const modal = document.createElement("div");
modal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,10,10,0.85);z-index:120;align-items:center;justify-content:center;";
modal.innerHTML = `<form id="admF" style="background:#eb6a28;border:4px solid #0a0a0a;padding:20px;width:300px;display:flex;flex-direction:column;gap:10px;">
  <div style="font-weight:bold;font-size:15px;">// DEFrAS Admin Auth</div>
  <input type="password" id="admP" placeholder="Secret key..." style="background:#0a0a0a;color:#f4f4f4;border:none;padding:8px;font-family:inherit;font-weight:bold;" />
  <div id="admErr" style="color:#cf1717;background:#0a0a0a;padding:6px 8px;font-weight:bold;font-size:12px;display:none;"></div>
  <div style="display:flex;gap:8px;">
    <button type="submit" style="flex:1;background:#cf1717;color:#0a0a0a;border:2px solid #0a0a0a;padding:6px;font-weight:bold;cursor:pointer;">Login</button>
    <button type="button" id="admC" style="background:#9a9a9a;color:#0a0a0a;border:2px solid #0a0a0a;padding:6px;font-weight:bold;cursor:pointer;">Cancel</button>
  </div>
</form>`;
document.body.appendChild(modal);

document.getElementById("admC").onclick = () => { modal.style.display = "none"; };
document.getElementById("admF").onsubmit = (e) => {
  e.preventDefault();
  if (Date.now() < failCount) return;
  const v = document.getElementById("admP").value.trim();
  if (!v) return;
  sec = v; localStorage.setItem("defras_admin_secret", v);
  document.getElementById("admP").value = ""; modal.style.display = "none";
  load();
};

document.querySelector(".logo-slot").ondblclick = () => {
  if (sec && confirm("Exit DEFrAS Admin mode?")) {
    sec = ""; localStorage.removeItem("defras_admin_secret"); load();
  } else if (!sec) { document.getElementById("admErr").style.display = "none"; modal.style.display = "flex"; document.getElementById("admP").focus(); }
};

window.delMsg = async (id) => {
  if (!sec) return;
  await fetch(DB + "/" + id + ".json", { method: "DELETE" });
  load();
};

function makeMsgNode([id, m]) {
  const d = document.createElement("div");
  const a = (m.author || "guest").replace(/</g, "&lt;");
  const b = m.isAdmin ? `<span style="color:#cf1717;background:#0a0a0a;padding:0 4px;">DEFrAS ★</span>` : `<span>${a}</span>`;
  const x = sec ? `<button onclick="delMsg('${id}')" style="margin-left:auto;background:#0a0a0a;color:#cf1717;border:none;cursor:pointer;font-weight:bold;padding:0 5px;">×</button>` : "";
  const timeStr = m.ts ? new Date(m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', timeZone:'UTC'}) : "";
  d.innerHTML = `<div class="msg-header"><div class="msg-avatar">${m.isAdmin ? "★" : "◈"}</div>${b} <span style="font-size:11px;opacity:0.75;">${timeStr}</span>${x}</div><div class="msg-text"></div>`;
  d.querySelector(".msg-text").textContent = m.text;
  return d;
}

function renderArchive() {
  const q = document.getElementById("archSearch").value.toLowerCase();
  const box = document.getElementById("archList");
  const filtered = allEntries.filter(([_, m]) => (m.text || "").toLowerCase().includes(q) || (m.isAdmin ? "defras admin " : (m.author || "guest").toLowerCase()).includes(q));
  document.getElementById("archCount").textContent = `// CHAT ARCHIVE (${filtered.length})`;
  box.innerHTML = "";
  filtered.forEach(item => box.appendChild(makeMsgNode(item)));
}

async function load() {
  try {
    const r = await fetch(DB + ".json");
    const data = await r.json();
    const list = document.getElementById("chatList");
    list.innerHTML = "";
    if (!data || data.error) { allEntries = []; archBtn.textContent = "ARCHIVE (0) [+]"; if (archModal.style.display === "flex") renderArchive(); return; }
    allEntries = Object.entries(data);
    archBtn.textContent = `ARCHIVE (${allEntries.length}) [+]`;
    allEntries.slice(-20).forEach(item => list.appendChild(makeMsgNode(item)));
    if (archModal.style.display === "flex") renderArchive();
  } catch (e) {}
}

f.onsubmit = async (e) => {
  e.preventDefault();
  const v = mIn.value.trim();
  if (!v) return;
  if (!sec) {
    if (Date.now() - lastSentTime < 5000) { mIn.placeholder = "Wait 5s (anti-spam)..."; return; }
    if (v === lastSentText) { mIn.placeholder = "No duplicate spam!"; return; }
  }
  mIn.value = ""; mIn.placeholder = "Text...|";
  if (!sec) {
    const rateRes = await fetch(BASE + "/lastPost.json", { method: "PUT", body: JSON.stringify({ ".sv": "timestamp" }) });
    if (!rateRes.ok) { mIn.placeholder = "Too fast! Wait 4s..."; return; }
  }
  const author = nIn.value.trim() || ("anon#" + Math.floor(100 + Math.random() * 899));
  const r = await fetch(DB + ".json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, text: v, isAdmin: Boolean(sec), secret: sec || "", ts: Date.now() })
  });
  if (!r.ok && sec) {
    sec = ""; localStorage.removeItem("defras_admin_secret");
    failCount = Date.now() + 3000;
    const err = document.getElementById("admErr");
    err.textContent = "// Access denied (wait 3s)"; err.style.display = "block";
    modal.style.display = "flex";
  } else {
    lastSentText = v; lastSentTime = Date.now();
  }
  await load();
  chatPanel.scrollTop = chatPanel.scrollHeight;
};

load();
setInterval(load, 4000);

// Живой таймер 4 -> 0 в строке ввода и плашка предупреждения при спаме
const cdBadge = document.createElement("span");
cdBadge.textContent = "0s";
cdBadge.style.cssText = "color:#9a9a9a;font-size:13px;font-weight:bold;margin-right:8px;min-width:24px;text-align:right;";
f.insertBefore(cdBadge, f.querySelector("button"));

const spamToast = document.createElement("div");
spamToast.style.cssText = "display:none;position:fixed;bottom:64px;right:235px;background:#0a0a0a;color:#cf1717;border:2px solid #cf1717;padding:6px 10px;font-weight:bold;font-size:12px;z-index:95;";
document.body.appendChild(spamToast);

let cdLeft = 0, spamTimer;
function showSpamWarn(msg) {
  spamToast.textContent = msg;
  spamToast.style.display = "block";
  clearTimeout(spamTimer);
  spamTimer = setTimeout(() => { spamToast.style.display = "none"; }, 2200);
}

setInterval(() => {
  if (cdLeft > 0) {
    cdLeft--;
    cdBadge.textContent = cdLeft + "s";
    cdBadge.style.color = cdLeft > 0 ? "#cf1717" : "#9a9a9a";
  }
}, 1000);

const prevSubmit = f.onsubmit;
f.onsubmit = async (e) => {
  e.preventDefault();
  const v = mIn.value.trim();
  if (!v) return;
  if (!sec && cdLeft > 0) {
    showSpamWarn(`// Anti-spam: wait ${cdLeft}s`);
    return;
  }
  if (!sec && v === lastSentText) {
    showSpamWarn("// Anti-spam: duplicate message");
    return;
  }
  await prevSubmit(e);
  if (!sec && lastSentText === v) {
    cdLeft = 4;
    cdBadge.textContent = "4s";
    cdBadge.style.color = "#cf1717";
  }
};

// Прокачанный компактный архив с группировкой по датам, счетчиком за день и вкладками ALL / DEFrAS / GUESTS
let archTab = "all";
archModal.innerHTML = `<div style="background:#d45b1e;border:4px solid #0a0a0a;width:100%;max-width:600px;max-height:84vh;display:flex;flex-direction:column;padding:12px;gap:8px;">
  <div style="display:flex;justify-content:space-between;align-items:center;background:#0a0a0a;color:#f4f4f4;padding:6px 10px;font-weight:bold;font-size:13px;">
    <span id="archCount">// CHAT ARCHIVE</span>
    <button id="archClose" style="background:#cf1717;color:#0a0a0a;border:none;padding:2px 8px;font-weight:bold;cursor:pointer;">X</button>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;">
    <button class="atab" data-t="all" style="background:#0a0a0a;color:#f4f4f4;border:2px solid #0a0a0a;padding:3px 8px;font-family:inherit;font-weight:bold;font-size:12px;cursor:pointer;">ALL</button>
    <button class="atab" data-t="admin" style="background:#cf1717;color:#0a0a0a;border:2px solid #0a0a0a;padding:3px 8px;font-family:inherit;font-weight:bold;font-size:12px;cursor:pointer;">DEFrAS ★</button>
    <button class="atab" data-t="guest" style="background:#9a9a9a;color:#0a0a0a;border:2px solid #0a0a0a;padding:3px 8px;font-family:inherit;font-weight:bold;font-size:12px;cursor:pointer;">GUESTS</button>
    <input type="text" id="archSearch" placeholder="Search text / nick / HH:MM..." style="flex:1;min-width:140px;background:#0a0a0a;color:#f4f4f4;border:2px solid #0a0a0a;padding:4px 8px;font-family:inherit;font-weight:bold;font-size:12px;" />
  </div>
  <div id="archList" style="overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;"></div>
</div>`;

document.getElementById("archClose").onclick = () => { archModal.style.display = "none"; };
document.getElementById("archSearch").oninput = renderArchive;
archModal.querySelectorAll(".atab").forEach(b => {
  b.onclick = () => {
    archTab = b.dataset.t;
    archModal.querySelectorAll(".atab").forEach(x => x.style.outline = x === b ? "2px solid #f4f4f4" : "none");
    renderArchive();
  };
});

renderArchive = function() {
  const q = document.getElementById("archSearch").value.toLowerCase();
  const box = document.getElementById("archList");
  const filtered = allEntries.filter(([_, m]) => {
    if (archTab === "admin" && !m.isAdmin) return false;
    if (archTab === "guest" && m.isAdmin) return false;
    const tStr = m.ts ? new Date(m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', timeZone:'UTC'}) : "";
    return (m.text || "").toLowerCase().includes(q) || (m.isAdmin ? "defras admin " : (m.author || "guest").toLowerCase()).includes(q) || tStr.includes(q);
  });
  document.getElementById("archCount").textContent = `// ARCHIVE (${filtered.length} total)`;
  box.innerHTML = "";

  const groups = {};
  filtered.forEach(item => {
    const dKey = item[1].ts ? new Date(item[1].ts).toLocaleDateString("ru-RU", {timeZone:"UTC"}) : "Unknown date";
    (groups[dKey] = groups[dKey] || []).push(item);
  });

  Object.entries(groups).forEach(([date, items]) => {
    const hdr = document.createElement("div");
    hdr.style.cssText = "background:#0a0a0a;color:#eb6a28;padding:3px 8px;font-size:12px;font-weight:bold;margin-top:4px;display:flex;justify-content:space-between;";
    hdr.innerHTML = `<span>// ${date} [UTC]</span><span>${items.length} msg</span>`;
    box.appendChild(hdr);

    items.forEach(([id, m]) => {
      const row = document.createElement("div");
      row.style.cssText = "background:rgba(10,10,10,0.16);border-left:3px solid " + (m.isAdmin ? "#cf1717" : "#0a0a0a") + ";padding:4px 8px;font-size:12px;";
      const tStr = m.ts ? new Date(m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', timeZone:'UTC'}) : "--:--";
      const nick = m.isAdmin ? `<b style="background:#0a0a0a;color:#cf1717;padding:0 4px;">DEFrAS ★</b>` : `<b>${(m.author || "guest").replace(/</g, "&lt;")}</b>`;
      const del = sec ? `<button onclick="delMsg('${id}')" style="float:right;background:#0a0a0a;color:#cf1717;border:none;cursor:pointer;font-weight:bold;padding:0 5px;">×</button>` : "";
      row.innerHTML = `<div><span style="opacity:0.8;">[${tStr}]</span> ${nick}: ${del}</div><div style="color:#f4f4f4;font-weight:bold;margin-top:2px;word-break:break-word;"></div>`;
      row.lastElementChild.textContent = m.text;
      box.appendChild(row);
    });
  });
};

// Уникальный UID устройства + система банов/мутов для админа
let myUid = localStorage.getItem("defras_uid");
if (!myUid) {
  myUid = "u_" + Math.random().toString(36).substring(2, 8);
  localStorage.setItem("defras_uid", myUid);
}
let activeBans = {};

window.banUser = async (uid, mins) => {
  if (!sec || !uid) return;
  const until = mins === 0 ? 0 : Date.now() + mins * 60 * 1000;
  await fetch(`${BASE}/bans/${uid}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ until, secret: sec })
  });
  await load();
};

const origMakeMsg = makeMsgNode;
makeMsgNode = function([id, m]) {
  const d = origMakeMsg([id, m]);
  if (sec && !m.isAdmin && m.uid) {
    const isBanned = activeBans[m.uid] && activeBans[m.uid].until > Date.now();
    const hdr = d.querySelector(".msg-header");
    const tools = document.createElement("span");
    tools.style.cssText = "display:inline-flex;gap:3px;margin-left:4px;font-size:10px;";
    tools.innerHTML = isBanned
      ? `<button onclick="banUser('${m.uid}', 0)" title="Unban ${m.uid}" style="background:#0a0a0a;color:#4caf50;border:1px solid #4caf50;padding:0 3px;cursor:pointer;">UNBAN</button>`
      : `<span style="background:#0a0a0a;color:#9a9a9a;padding:0 3px;">${m.uid}</span>
         <button onclick="banUser('${m.uid}', 15)" title="Mute 15m" style="background:#0a0a0a;color:#eb6a28;border:none;padding:0 3px;cursor:pointer;">M15</button>
         <button onclick="banUser('${m.uid}', 5256000)" title="Permaban" style="background:#0a0a0a;color:#cf1717;border:none;padding:0 3px;cursor:pointer;">BAN</button>`;
    hdr.insertBefore(tools, hdr.lastElementChild);
  }
  return d;
};

const origLoad = load;
load = async function() {
  try {
    const bRes = await fetch(`${BASE}/bans.json`);
    activeBans = (await bRes.json()) || {};
  } catch (e) {}
  await origLoad();
};

f.onsubmit = async (e) => {
  e.preventDefault(); const v = mIn.value.trim(); if (!v) return;
  if (!sec && activeBans[myUid]?.until > Date.now()) { showSpamWarn("// Banned or muted"); return; }
  if (!sec && cdLeft > 0) { showSpamWarn("// Wait " + cdLeft + "s"); return; }
  mIn.value = "";
  if (!sec && !(await fetch(BASE + "/lastPost.json", { method: "PUT", body: JSON.stringify({ ".sv": "timestamp" }) })).ok) { showSpamWarn("// Too fast! Wait 4s"); return; }
  const author = nIn.value.trim() || ("anon#" + Math.floor(100 + Math.random() * 899));
  const r = await fetch(DB + ".json", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author, uid: myUid, text: v, isAdmin: Boolean(sec), secret: sec || "", ts: Date.now() }) });
  if (!r.ok && sec) { sec = ""; localStorage.removeItem("defras_admin_secret"); alert("Invalid admin key"); }
  else { lastSentText = v; if (!sec) { cdLeft = 4; cdBadge.textContent = "4s"; cdBadge.style.color = "#cf1717"; } }
  await load(); chatPanel.scrollTop = chatPanel.scrollHeight;
};
// Компактная модерация по клику на UID пользователя (любое время мута в минутах или вечный бан)
window.openMod = (uid) => {
  if (!sec || !uid) return;
  const ans = prompt(`Moderate [${uid}]\nEnter mute minutes (1 = 1m, 1440 = 1d, 0 = UNBAN)\nor type "ban" for permaban:`, "15");
  if (ans === null) return;
  const v = ans.trim().toLowerCase();
  if (v === "ban") banUser(uid, 52560000);
  else if (!isNaN(Number(v))) banUser(uid, Number(v));
};


// Наглядные уведомления модерации + кнопка UNBAN внутри модалки
const origBanUser = window.banUser;
window.banUser = async (uid, mins) => {
  await origBanUser(uid, mins);
  if (mins === 0) showWarn(`// Unbanned [${uid}]`);
  else if (mins >= 50000000) showWarn(`// Permabanned [${uid}]`);
  else showWarn(`// Muted [${uid}] for ${mins}m`);
};

const unbanBtn = document.createElement("button");
unbanBtn.type = "button";
unbanBtn.textContent = "UNBAN";
unbanBtn.style.cssText = "background:#0a0a0a;color:#4caf50;border:2px solid #4caf50;padding:6px;font-weight:bold;cursor:pointer;";
unbanBtn.onclick = () => { banUser(targetUid, 0); modBox.style.display = "none"; };
document.getElementById("modForm").lastElementChild.insertBefore(unbanBtn, document.getElementById("modCancel"));


// Плавная физика отставания (lerp-инерция) для шторки чата, нижней плашки и левого бегунка
const stripe = document.querySelector(".red-stripe");
const rightSide = document.querySelector(".right-sidebar");
const bottomBar = document.querySelector(".bottom-bar");

if (stripe && rightSide && bottomBar) {
  stripe.textContent = "";
  stripe.style.cssText = "background:var(--red);border-right:4px solid var(--black);position:relative;cursor:ew-resize;user-select:none;";
  const grip = document.createElement("div");
  grip.style.cssText = "width:10px;height:42px;background:#f4f4f4;border:2px solid #0a0a0a;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);";
  stripe.appendChild(grip);

  rightSide.style.position = "fixed";
  rightSide.style.right = "0";
  rightSide.style.top = "118px";
  rightSide.style.height = "calc(100vh - 118px)";
  rightSide.style.zIndex = "45";
  rightSide.style.transition = "none";
  bottomBar.style.transition = "none";

  let targetW = 220, currentW = 220, draggingChat = false;

  function tickPhysics() {
    if (window.innerWidth > 850) {
      currentW += (targetW - currentW) * 0.22;
      if (Math.abs(targetW - currentW) < 0.2) currentW = targetW;
      rightSide.style.width = currentW.toFixed(1) + "px";
      bottomBar.style.right = (currentW + 15).toFixed(1) + "px";
    }
    requestAnimationFrame(tickPhysics);
  }
  requestAnimationFrame(tickPhysics);

  stripe.addEventListener("mousedown", (e) => { draggingChat = true; e.preventDefault(); });
  window.addEventListener("mousemove", (e) => {
    if (!draggingChat) return;
    targetW = Math.min(620, Math.max(220, window.innerWidth - e.clientX));
  });
  window.addEventListener("mouseup", () => {
    if (!draggingChat) return;
    draggingChat = false;
    if (Math.abs(targetW - 440) < 60) targetW = 440;
    else if (targetW < 260) targetW = 220;
  });
  stripe.addEventListener("dblclick", () => {
    targetW = targetW > 300 ? 220 : 440;
  });
}

setInterval(() => {
  if (!sec) return;
  document.querySelectorAll(".msg-header").forEach(hdr => {
    const sp = hdr.querySelector("span[data-v18]");
    if (sp && !hdr.querySelector(".del-fix")) {
      const mText = hdr.nextElementSibling?.textContent;
      const found = allEntries.find(([_, m]) => m.text === mText && !m.isAdmin);
      if (found) {
        const btn = document.createElement("button");
        btn.className = "del-fix";
        btn.textContent = "×";
        btn.style.cssText = "margin-left:auto;background:#0a0a0a;color:#cf1717;border:none;cursor:pointer;font-weight:bold;padding:0 5px;";
        btn.onclick = () => delMsg(found);
        hdr.appendChild(btn);
      }
    }
  });
}, 700);

let tw=220,cw=220,dg=0;const st=document.querySelector(".red-stripe"),rs=document.querySelector(".right-sidebar"),bb=document.querySelector(".bottom-bar");if(st&&rs&&bb){st.onmousedown=e=>{dg=1;e.preventDefault();};window.addEventListener("mousemove",e=>{if(dg)tw=Math.min(620,Math.max(220,window.innerWidth-e.clientX));});window.addEventListener("mouseup",()=>{if(dg){dg=0;if(Math.abs(tw-440)<60)tw=440;else if(tw<260)tw=220;}});(function loop(){if(window.innerWidth>850){cw+=(tw-cw)*0.15;rs.style.width=cw+"px";bb.style.right=(cw+15)+"px";}requestAnimationFrame(loop);})();}

// Двухуровневая тень по высоте: длинная (28px) на фоне ПОД карточками, короткая (11px) НАД карточками
const bgShadow = document.createElement("div");
bgShadow.style.cssText = "position:fixed;top:118px;bottom:0;width:28px;background:rgba(54,62,125,0.43);mix-blend-mode:multiply;pointer-events:none;z-index:1;";
document.body.appendChild(bgShadow);
(function syncShadow() {
  const rs = document.querySelector(".right-sidebar");
  if (rs && window.innerWidth > 850) bgShadow.style.right = rs.offsetWidth + "px";
  requestAnimationFrame(syncShadow);
})();
