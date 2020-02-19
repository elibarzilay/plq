"use strict";

const passwordTest  = "(password)";
const sudoUser      = "eli";
const opButtons     = ["Status", "Start", "Stop"];
const opWrap        = s => `〈!${s}!〉`;
const qeditInitText = "???\n  --==--\n";
const multiAll      = "〈all〉";
const multiNone     = "〈none〉";

const $ = x => typeof x === "string" ? document.getElementById(x) : x;

const sleep = ms => () => new Promise(res => setTimeout(res, ms));

const objQuery = o =>
  Object.keys(o).map(k => `${k}=${encodeURIComponent(o[k])}`).join("&")

const evListener = (id, type, f) =>
  $(id).addEventListener(type, f, true);

const show = (msg, kind, txt = null, editor = false) => {
  const messages = $("log");
  while (messages.children.length > 12) messages.lastChild.remove();
  const fst = document.createElement("div");
  fst.append(document.createTextNode(msg));
  fst.classList.add(kind || "bad");
  if (txt) {
    const snd = document.createElement("div");
    snd.classList.add("histtext");
    snd.append(document.createTextNode(txt));
    snd.classList.add("reuse-text");
    if (txt != passwordTest)
      snd.addEventListener("click", () => {
        if (editor != editorOn) toggleEditor();
        curText.value = txt; curText.focus(); });
    fst.append(snd);
  }
  messages.prepend(fst);
  return fst;
};
const makeSend = (msg, txt, editor) => show(msg, "send", txt, editor);
const changeSend = (node, msg, kind) => {
  node.classList.remove("send");
  node.classList.add(kind || "bad");
  if (typeof msg === "string") node.firstChild.nodeValue = msg;
  else { node.firstChild.remove(); node.prepend(msg); }
};

const getImg = () => {
  const data = localStorage.getItem("plq-img");
  if (!data) return null;
  const img = new Image();
  img.src = data;
  img.classList.add("login-image");
  return img;
};
const setImg = txt => {
  const n = $("menu-handle");
  const old = n.querySelector("img");
  if (old) old.remove();
  if (!txt) localStorage.removeItem("plq-img");
  else { localStorage.setItem("plq-img", txt); n.append(getImg()); }
};

const sendToLogger = (txt, ok = null, fail = null, editor = false) => {
  if (txt == "") return;
  const req = new XMLHttpRequest();
  const msg = makeSend("Sending...", txt, editor);
  req.onreadystatechange = () => {
    if (req.readyState != 4) return;
    const isImage = /^data:image\/png;base64,/.test(req.responseText);
    const reply = !isImage ? req.responseText
                           : (setImg(req.responseText), getImg());
    console.log("--> %o", reply);
    const isOK = req.status == 200
              && (isImage || /^OK\b/.test(req.responseText));
    changeSend(msg, reply, isOK && "ok");
    if (isOK) setSelectedButtons(txt), ok && ok(); else fail && fail();
  };
  const [user, pswd] = getLogin();
  req.open("GET", `/plq?${
    objQuery({u: user || "???", p: pswd || "???", t: txt})}`, true);
  req.send();
};

class BSet extends Set {
  toggle(val) { if (this.has(val)) this.delete(val); else this.add(val); }
  addAll(vals) { vals.forEach(v => this.add(v)); }
  toString() { return this.size ? [...this.values()].join("; ") : multiNone; }
}

let lastButtons = "";
const setButtons = (bs = "") => {
  let flags = "";
  { const m = bs.match(/^〈〈(.*)〉〉\n([\s\S]*)$/);
    if (m) { flags = m[1]; bs = m[2]; }
  }
  bs = bs.split("\n").map(s => s.trim()).filter(s => s.length);
  const isMulti = flags.includes("+");
  const isSudo = getUser() == sudoUser
              && (lastButtons.length && lastButtons[0] == "*" ? true : "new");
  const newButtons = (isSudo ? "*" : "-") + "\n" + bs.join("\n");
  if (newButtons == lastButtons) return; else lastButtons = newButtons;
  const div = $("buttons");
  div.dataset.mode = isMulti ? "multi" : "";
  const toSend = !isMulti ? b => b : (() => {
    const multi = new BSet();
    return b => ((b == multiNone ? multi.clear() :
                  b == multiAll  ? multi.addAll(bs) :
                  multi.toggle(b)),
                 multi.toString());
  })();
  const mkBreak = () => {
    const b = document.createElement("div");
    b.classList.add("break");
    div.appendChild(b);
    return b;
  };
  const mkButton = (txt, wrap = toSend) => {
    const b = document.createElement("button");
    b.classList.add("btn");
    if (wrap === opWrap) b.classList.add("op");
    b.innerText = txt;
    div.appendChild(b);
    evListener(b, "click", () => sendToLogger(wrap(txt)));
    return b;
  };
  const equalizeWidths = bs => {
    const max = bs.map(b => b.getBoundingClientRect().width)
                  .reduce((x,y) => Math.max(x,y), 0);
    bs.forEach(b => b.style.width = max + "px");
  };
  const createElts = () => {
    while (div.firstChild) div.firstChild.remove();
    if (isSudo) {
      equalizeWidths(opButtons.map(b => mkButton(b, opWrap)));
      mkBreak();
    }
    equalizeWidths(bs.map(b => mkButton(b)));
    if (isMulti) {
      mkBreak();
      equalizeWidths([mkButton(multiAll), mkButton(multiNone)]);
    }
    if (isSudo == "new") setTimeout(() => sendToLogger(opWrap("Status")), 250);
  };
  div.style.height = `${div.scrollHeight}px`;
  Promise.resolve()
    .then(sleep(50)) .then(()=> div.style.height = `0`)
    .then(sleep(500)).then(()=> createElts())
    .then(sleep(50)) .then(()=> div.style.height = `${div.scrollHeight}px`)
    .then(sleep(500)).then(()=> div.style.height = ``);
};

const setSelectedButtons = txt => {
  const div = $("buttons");
  const bs = [...div.querySelectorAll(".btn:not(.op)")];
  const setSel = (b, sel) => b.classList[sel ? "add" : "remove"]("selected");
  if (div.dataset.mode != "multi")
    return bs.forEach(b => setSel(b, b.innerText == txt));
  const txts = txt == multiNone ? [] : txt.split(/ *; */);
  let all = true, none = true;
  bs.forEach(b => { // relies on none/all being at the end
    if (b.innerText == multiAll) setSel(b, all);
    else if (b.innerText == multiNone) setSel(b, none);
    else if (txts.includes(b.innerText)) { none = false; setSel(b, true);  }
    else                                 { all  = false; setSel(b, false); }
  });
};

let curText = $("thetext-line"), editorOn = false, editorModified = false;
const theTextSend = (clear = !editorOn) => {
  sendToLogger(curText.value.trim(), clear && (() => curText.value = ""),
               null, editorOn);
  curText.focus();
};
const theTextKeyListen = (id, editor) =>
  evListener(id, "keyup", e => {
    switch (e.key) {
    case "Enter":
      if (editor && !(e.ctrlKey || e.altKey)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      theTextSend(!editor);
      return;
    case "Escape":
      if (editor) return;
      e.target.setSelectionRange(0, e.target.value.length);
      document.execCommand("insertText", false, "");
      return;
    }
  });
theTextKeyListen("thetext-line", false);
theTextKeyListen("thetext-area", true);
evListener("thetext-submit", "click", () => theTextSend());
evListener("thetext-done",   "click", () => editorDone());
$("thetext-area").addEventListener("input", e => {
  if (editorModified) return;
  editorModified = true;
  sendToLogger("New Question");
});

const startWS = (() => {
  // The delay D between runs starts at MIN sec, and in each iteration,
  // then it goes to D*(STEPUP/T**STEPDN) for an execution that lasted T
  // secs, kept within the MIN..MAX bounds.
  const MIN = 1, MAX = 60, STEPUP = 1.5,
        STEPDN = STEPUP ** (1/30); // T = 30s => no change in delay
  let ws, start, delay = MIN;
  return () => {
    start = Date.now();
    ws = new WebSocket("wss://plq.barzilay.org/ws");
    ws.onmessage = e => setButtons(e.data);
    ws.onerror = e => console.error("websocket error", e);
    ws.onclose = () => {
      const elapsed = (Date.now() - start) / 1000;
      const mult    = STEPUP / (STEPDN ** elapsed);
      delay         = Math.max(Math.min(delay * mult, MAX), MIN);
      console.log(`websocket closed, restarting in ${Math.round(delay)}s`);
      setTimeout(startWS, 1000 * delay);
    };
  };
})();

const getLogin = () =>
  ["plq-user", "plq-pswd"].map(i => localStorage.getItem(i));
const getUser = () => getLogin()[0];
const setLogin = () => {
  const user = $("user").value.trim().toLowerCase(),
        pswd = $("pswd").value;
  if (user == "") return show("missing username");
  if (pswd == "") return show("missing password");
  $("user").value = user;
  $("pswd").value = "";
  localStorage.setItem("plq-user", user);
  localStorage.setItem("plq-pswd", md5(pswd));
  setImg(null);
  sendToLogger(passwordTest,
               () => { hideLogin();
                       if (user == sudoUser) setButtons(); },
               () => { localStorage.removeItem("plq-pswd");
                       localStorage.removeItem("plq-user");
                       setImg(null); });
};
if (getUser()) setImg(localStorage.getItem("plq-img"));

let menuShown = false;
const toggleMenu = () => {
  menuShown = !menuShown;
  $("nav-links").classList[menuShown ? "add" : "remove"]("expanded");
  $("menu-handle")[menuShown ? "focus" : "blur"]();
};
const hideMenu = () => menuShown && toggleMenu();
evListener("menu-handle", "click", toggleMenu);
evListener("menu-handle", "blur", () => setTimeout(hideMenu,100));

const showLogin = () => {
  $("text-container").style.display = "none";
  $("login-container").style.display = "block";
  const user = localStorage.getItem("plq-user");
  if (!user) $("user").focus();
  else { $("user").value = user; $("pswd").focus(); }
};
const hideLogin = e => {
  $("text-container").style.display = "block";
  $("login-container").style.display = "none";
};
const toggleLogin = e =>
  $("login-container").style.display == "none" ? showLogin()
  : $("pswd").value == "" && getUser() ? hideLogin()
  : setLogin();
const keyLogin = e => {
  switch (e.key) {
  case "Enter":  return setLogin();
  case "Escape": if (getUser()) return hideLogin();
                 else return show("please enter your login information");
  }
};
evListener("show-login", "click", toggleLogin);
["user", "pswd"].forEach(k => evListener(k, "keyup", keyLogin));
if (!localStorage.getItem("plq-pswd")) showLogin();

const resetEditor = (force = false) => {
  if (!editorOn) return;
  if (force || curText.value.trim() == "") {
    curText.value = qeditInitText; editorModified = false;
    curText.focus(); curText.setSelectionRange(0,3);
  }
};

const toggleEditor = () => {
  let focus = document.activeElement == curText;
  if (!editorOn && getUser() != sudoUser) return;
  editorOn = !editorOn;
  curText = $(editorOn ? "thetext-area" : "thetext-line");
  document.body.classList[editorOn ? "add" : "remove"]("qedit");
  if (focus) curText.focus();
  resetEditor();
};

const editorDone = () => {
  if (!editorOn) return;
  theTextSend(true);
  sendToLogger(opWrap("Done"), () => resetEditor(true));
};

let timerRunning = null, timerDeadline = null, timerShown = null;
const timerUpdate = () => {
  const show = Math.ceil((timerDeadline - Date.now()) / 1000);
  if (timerShown == show) return;
  const pad2 = n => n < 10 ? "0"+n : n;
  const tDiv = $("timer");
  const setText = (txt, tag = "span") => {
    tDiv.innerHTML = `<div><${tag}>${txt}</${tag}></div>`;
    tDiv.style.width = tDiv.children[0].getBoundingClientRect().width + "px";
  }
  if (show >= 0) {
    timerShown = show;
    tDiv.classList.remove("over");
    setText(show<60 ? show : Math.floor(show/60)+":"+pad2(show%60), "code");
  } else if (show >= -10) {
    tDiv.classList.add("over");
    const bzz = ["Bz", "Bzz", "Bzzz", "BZZZ"];
    setText("!!!"+bzz[Math.min(Math.floor((-show-1)/2), bzz.length-1)]+"!!!");
  } else timerAdd(0)();
};
const timerAdd = d => () => {
  if (getUser() != sudoUser) return;
  const now = Date.now();
  timerDeadline = (timerDeadline || now) + d*1000;
  if (!!timerRunning === (timerDeadline > now)) return;
  const tDiv = $("timer");
  tDiv.classList.toggle("active");
  tDiv.classList.remove("over");
  tDiv.style.opacity = 0;
  tDiv.style.width = "";
  setTimeout(() => tDiv.style.opacity = 0.9, 100);
  if (timerRunning) { clearInterval(timerRunning); timerRunning = null; }
  if (timerDeadline > now) timerRunning = setInterval(timerUpdate, 100);
  else timerDeadline = null;
};

const hotKeys = new Map([
  ["t", () => curText.focus()],
  ["l", toggleLogin],
  ["s", toggleEditor],
  ["d", editorDone],
  ["ArrowUp",   timerAdd(+10)],
  ["ArrowDown", timerAdd(-10)]
]);

window.addEventListener("keydown", (e =>
  e.altKey && !e.shiftKey && !e.ctrlKey && hotKeys.has(e.key)
  && (e.preventDefault(), e.stopImmediatePropagation())),
  true);
window.addEventListener("keyup", (e =>
  e.altKey && !e.shiftKey && !e.ctrlKey && hotKeys.has(e.key)
  && (e.preventDefault(), e.stopImmediatePropagation(), hotKeys.get(e.key)())),
  true);

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(
      window.location.href.replace(/\/[^\/]*$/, "/worker.js"))
    .then(reg => console.log(`ServiceWorker registered for: ${reg.scope}`),
          err => console.log(`ServiceWorker failure: ${err}`));
  }
  setButtons();
  setTimeout(startWS, 100);
});

let installEvt = null;
window.addEventListener("beforeinstallprompt", e => {
  $("install").style.display = "block";
  installEvt = e;
});
evListener("install", "click", () => setTimeout(() => {
  if (!installEvt) return;
  console.log("Installing...");
  $("install").style.display = "none";
  installEvt.prompt();
  installEvt.userChoice.then(res => {
    console.log(`User ${res.outcome} the install prompt`);
    installEvt = null;
  });
}, 250));
