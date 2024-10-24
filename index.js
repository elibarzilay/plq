"use strict";

const passwordTest  = "(password)";
const sudoUser      = "eli";
const opButtons     = ["Status", "Start", "Stop"];
const opWrap        = s => `〈!${s}!〉`;
const qeditInitText = "???\n  --==--\n=> ";
const multiAll      = "〈all〉";
const multiNone     = "〈none〉";

const inputModes = {
  "suggest": [
    "Write your suggested question + answers here", "",
    "  (If you make a mistake, please indicate that this is a fix at",
    "  the top.  I'm going over these suggestions manually, and it",
    "  would help to avoid me guessing when you resubmit a fixed",
    "  suggestion.)"
  ].join("\n"),
  "feedback": "Your feedback here."
};

const $ = x => typeof x === "string" ? document.getElementById(x) : x;

const rec = f => f((...xs) => rec(f)(...xs));

const sleep = ms => ()=> new Promise(res => setTimeout(res, ms));

const objQuery = o =>
  Object.keys(o).map(k => `${k}=${encodeURIComponent(o[k])}`).join("&");

const evListener = (id, type, f) =>
  $(id).addEventListener(type, f, true);

const isSudo = ()=> getUser() === sudoUser;

const show = (msg_css, txt, click) => {
  const [msg, css] = Array.isArray(msg_css) ? msg_css : [msg_css, "send"];
  const messages = $("log");
  while (messages.children.length > 12) messages.lastChild.remove();
  const fst = document.createElement("div");
  fst.append(document.createTextNode(msg));
  if (css) fst.classList.add(css);
  if (txt) {
    const snd = document.createElement("div");
    snd.classList.add("histtext");
    snd.append(document.createTextNode(txt));
    if (click) {
      snd.classList.add("reuse-text");
      snd.addEventListener("click", click);
    }
    fst.append(snd);
  }
  messages.prepend(fst);
  return fst;
};
const showError = msg => show([msg, "bad"]);

const getImg = ()=> {
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

const send = (txt, ok, fail, click) => {
  if (txt == "") return;
  const req = new XMLHttpRequest();
  const msg = show("Sending...", txt, click);
  req.onreadystatechange = ()=> {
    if (req.readyState != 4) return;
    const isImage = /^data:image\/png;base64,/.test(req.responseText);
    const reply = !isImage ? req.responseText
                           : (setImg(req.responseText), getImg());
    // console.log("--> %o", reply);
    const isOK = req.status == 200
              && (isImage || /^OK\b/.test(req.responseText));
    msg.classList.remove("send");
    msg.classList.add(isOK ? "ok" : "bad");
    if (typeof reply === "string") msg.firstChild.nodeValue = reply;
    else { msg.firstChild.remove(); msg.prepend(reply); }
    if (isOK) ok && setTimeout(ok, 500); else fail && setTimeout(fail, 500);
  };
  const { username, password } = getLogin();
  const actual = inputMode ? `{${inputMode}}\n${txt}` : txt;
  req.open("GET", `/sub/plq?${
    objQuery({u: username || "???", p: password || "???", t: actual})}`, true);
  req.send();
};

let lastButtons = "", lastRawButtons = "";
const setButtons = (bs = lastRawButtons) => {
  lastRawButtons = bs;
  let flags = "";
  { const m = bs.match(/^〈〈(.*)〉〉\n([\s\S]*)$/);
    if (m) { flags = m[1]; bs = m[2]; }
  }
  const isFeedback = bs === "-FEEDBACK-";
  bs = isFeedback
    ? feedbackButtons
    : bs.split("\n").map(s => s.trim()).filter(s => s.length);
  const isMulti = flags.includes("+");
  const sudo = isSudo()
            && (lastButtons && lastButtons[0] == "*" ? true : "new");
  pleeze(sudo ? "listening" : bs.length ? "on" : "off");
  const newButtons = `${isSudo ? "*" : "-"}\n${flags}\n${bs.join("\n")}`;
  if (bs && newButtons == lastButtons) return; else lastButtons = newButtons;
  const div = $("buttons");
  div.dataset.mode = isMulti ? "multi" : "";
  let btns;
  const clickText = b => {
    const setall = f => btns.forEach(b => b.classList.toggle("selected", f(b)));
    if (!isMulti) { setall(bb => b == bb); return b.innerText; }
    else if (b.innerText == multiAll)  setall(b => true);
    else if (b.innerText == multiNone) setall(b => false);
    else b.classList.toggle("selected");
    return btns.filter(b => b.classList.contains("selected"))
               .map(b => b.innerText).join("; ") || multiNone;
  };
  const mkElement = (tag, classes, txt = null, isOp = false) => {
    const b = document.createElement(tag);
    (typeof classes === "string" ? [classes] : classes)
      .forEach(c => c && b.classList.add(c));
    if (txt) b.innerText = txt;
    div.appendChild(b);
    if (txt)
      evListener(b, "click",
                 isFeedback ? sendFeedback
                 : isOp ? rec(me => ()=> send(opWrap(txt), null, null, me))
                 : ()=> send(txt = clickText(b), ()=> setBtnStatus(txt), null,
                             reuseText(txt, false)));
    return b;
  };
  const mkBr    =   ()=> mkElement("div", "break");
  const mkBtn   = txt => mkElement("button", ["btn", isFeedback && "fdbk"], txt);
  const mkOpBtn = txt => mkElement("button", ["btn", "op"], txt, true);
  const equalWidths = bs => {
    const max = bs.map(b => b.getBoundingClientRect().width)
                  .reduce((x,y) => Math.max(x,y), 0);
    bs.forEach(b => b.style.width = max + "px");
    return bs;
  };
  const createElts = ()=> {
    while (div.firstChild) div.firstChild.remove();
    if (sudo) { equalWidths(opButtons.map(mkOpBtn)); mkBr(); }
    btns = bs.map(mkBtn);
    if (!isFeedback) btns = equalWidths(btns);
    if (isMulti) { mkBr(); equalWidths([multiAll, multiNone].map(mkBtn)); }
    if (sudo == "new")
      [...buttons.querySelectorAll(".btn.op")]
            .find(b => b.innerText.match(/Status/i)).click();
  };
  div.style.height = `${div.scrollHeight}px`;
  Promise.resolve()
    .then(sleep(50)) .then(()=> div.style.height = `0`)
    .then(sleep(500)).then(()=> createElts())
    .then(sleep(50)) .then(()=> div.style.height = `${div.scrollHeight}px`)
    .then(sleep(500)).then(()=> div.style.height = ``);
};

const setBtnStatus = (txt, css = "confirmed") => {
  const div = $("buttons");
  const bs = [...div.querySelectorAll(".btn:not(.op)")];
  const setSel = (b, sel) => b.classList.toggle(css, sel);
  if (div.dataset.mode != "multi")
    return bs.forEach(b => setSel(b, b.innerText == txt));
  const txts = txt == multiNone ? [] : txt.split(/ *; */);
  let all = css == "confirmed", none = css == "confirmed";
  bs.forEach(b => { // relies on none/all being at the end
    if      (b.innerText == multiAll)  setSel(b, all);
    else if (b.innerText == multiNone) setSel(b, none);
    else if (txts.includes(b.innerText)) { none = false; setSel(b, true);  }
    else                                 { all  = false; setSel(b, false); }
  });
};

let curText = $("thetext-line"), editorOn = false, editorModified = false;
const reuseText = (txt, editor = editorOn) => ()=> {
  if (editorOn != editor) toggleEditor();
  curText.value = txt; curText.focus();
};
const theTextSend = () => {
  const txt = curText.value.trim();
  const onOK = ()=> { setBtnStatus(txt); if (!editorOn) curText.value = ""; };
  setBtnStatus(txt, "selected");
  send(txt, onOK, null, reuseText(txt));
  curText.focus();
};
window.addEventListener("keyup", e => {
  switch (e.key) {
  case "Escape":
    if (!mdShown()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    mdClose();
    return;
  case "Enter":
    if (!editorOn) { theTextSend(); return; }
    if (editorOn && !(e.ctrlKey || e.altKey)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.ctrlKey) theTextSend();
    if (editorOn && e.altKey) mdToggle();
    return;
  case "Escape":
    if (editorOn) return;
    e.target.setSelectionRange(0, e.target.value.length);
    document.execCommand("insertText", false, "");
    return;
  }
});

evListener("thetext-submit", "click", ()=> theTextSend());
evListener("thetext-done",   "click", ()=> editorDone());
$("thetext-area").addEventListener("input", e => {
  if (editorModified || e.target.dataset.type) return;
  editorModified = true;
  send("New Question");
});

const feedbackButtons = [ "🙂", "  FOCUS! 🙁  " ];
const sendFeedback = ({ target }) =>
  ws && ws.send(JSON.stringify({
    msg: "feedback", n: feedbackButtons.indexOf(target.innerText),
    ...getLogin() }));

const pleaseAnimation = () => {
  const rnd = pad => `${Math.floor(Math.random() * (100 - 2*pad)) + pad}%`;
  const a = document.createElement("div");
  a.textContent = $("pleeze").textContent;
  a.className = "reaction";
  a.style.top = rnd(40); a.style.left = rnd(40);
  document.body.append(a);
  const move = () => {
    a.style.top = rnd(10); a.style.left = rnd(10);
    a.style.opacity = 0; a.style.fontSize = "300%";
    a.addEventListener("transitionend", () => a.remove());
  };
  setTimeout(move, 250);
};

let enablePleeze = 0; // 1 = only emoji, 2 = also sound

let ws = null;
const startWS = (()=> {
  // The delay D between runs starts at MIN sec, and in each iteration,
  // then it goes to D*(STEPUP/T**STEPDN) for an execution that lasted T
  // secs, kept within the MIN..MAX bounds.
  const MIN = 1, MAX = 60, STEPUP = 1.5,
        STEPDN = STEPUP ** (1/30); // T = 30s => no change in delay
  let start, delay = MIN;
  return ()=> {
    start = Date.now();
    ws = new WebSocket("wss://plq.barzilay.org/ws");
    ws.onopen = () => ws.send(JSON.stringify("web"));
    ws.onmessage = ({ data }) => {
      // console.log("message:", data);
      if (/^{[/a-zA-Z0-9_-]+\.mp3}$/.test(data)) {
        if (enablePleeze >= 1) pleaseAnimation();
        if (enablePleeze >= 2) new Audio(data.slice(1, -1)).play();
      } else {
        setButtons(data);
      }
    };
    ws.onerror = e => { pleeze("off"); /* console.error("websocket error", e); */ }
    ws.onclose = ()=> {
      const elapsed = (Date.now() - start) / 1000;
      const mult    = STEPUP / (STEPDN ** elapsed);
      delay         = Math.max(Math.min(delay * mult, MAX), MIN);
      console.log(`websocket closed, restarting in ${Math.round(delay)}s`);
      setTimeout(startWS, 1000 * delay);
      pleeze("off");
      ws = null;
    };
    pleeze("ws-open");
  };
})();

const getLogin = ()=>
  ({ username: localStorage.getItem("plq-user"),
     password: localStorage.getItem("plq-pswd")
   });
const getUser = ()=> localStorage.getItem("plq-user");
const setLogin = ()=> {
  const user = $("user").value.trim().toLowerCase(),
        pswd = $("pswd").value;
  if (user == "") return showError("missing username");
  if (pswd == "") return showError("missing password");
  $("user").value = user;
  $("pswd").value = "";
  localStorage.setItem("plq-user", user);
  localStorage.setItem("plq-pswd", md5(pswd));
  setImg(null);
  send(passwordTest,
       ()=> { hideLogin(); setButtons(); },
       ()=> { localStorage.removeItem("plq-pswd");
              localStorage.removeItem("plq-user");
              setImg(null); });
};
if (getUser()) setImg(localStorage.getItem("plq-img"));

let menuShown = false;
const toggleMenu = ()=> {
  menuShown = !menuShown;
  $("side-links").classList.toggle("expanded", menuShown);
  $("menu-handle")[menuShown ? "focus" : "blur"]();
};
const hideMenu = ()=> menuShown && toggleMenu();
evListener("menu-handle", "click", toggleMenu);
evListener("menu-handle", "blur", ()=> setTimeout(hideMenu,100));

evListener("login-container", "submit", e => e.preventDefault());
const showLogin = ()=> {
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
  // case "Enter":  return setLogin();
  case "Escape": if (getUser()) return hideLogin();
                 else return showError("please enter your login information");
  }
};
evListener("show-login", "click", toggleLogin);
["user", "pswd"].forEach(k => evListener(k, "keyup", keyLogin));
evListener("login-submit", "click", setLogin);
if (!localStorage.getItem("plq-pswd")) showLogin();

const pleeze = (()=> {
  const m = $("right-menu"), b = $("pleeze"), onOff = ["on", "off"];
  let on = false, listeningSent = false;
  const handle = (msg, more) => {
    if (msg === "ws-open") {
      listeningSent = false;
    } else if (onOff.includes(msg)) {
      m.style.display = (on = msg === "on") ? "block" : "none";
    } else if (ws && !listeningSent && msg === "listening") {
      ws.send(JSON.stringify({ msg: "listening", ...getLogin() }));
      listeningSent = true;
    }
  };
  evListener(b, "click", () =>
    ws && on && ws.send(JSON.stringify({ msg: "pleeze", ...getLogin() })));
  return handle;
})();

let lastQuietPlease = 0;
const QuietPleases = [
  "please/QuietPleaseMale.mp3",
  "please/QuietPleaseFemale.mp3"
];
const quietPlease = () => {
  const now = Date.now();
  const last = lastQuietPlease;
  lastQuietPlease = now;
  if (now - last < 2 * 60 * 1000) return; // don't nag if the time is bumped
  const qp = QuietPleases[Math.floor(Math.random() * QuietPleases.length)];
  new Audio(qp).play();
};

let doneText = "";
const resetEditor = (force = false) => {
  if (!editorOn) return;
  if (curText.value != doneText) {
    doneText = curText.value;
    curText.setSelectionRange(0, doneText.length);
    return;
  }
  if (force || curText.value.trim() == "") {
    curText.value = qeditInitText; editorModified = false;
    curText.focus(); curText.setSelectionRange(0,3);
  }
};

const toggleEditor = (force = false)=> {
  if (!force && !editorOn && !isSudo()) return;
  let focus = document.activeElement == curText;
  editorOn = !editorOn;
  curText = $(editorOn ? "thetext-area" : "thetext-line");
  document.body.classList.toggle("qedit", editorOn);
  if (focus) curText.focus();
  resetEditor();
};

const editorDone = ()=> {
  mdClose();
  if (!editorOn) return;
  send(opWrap("Done"), ()=> resetEditor(true));
};

let timerRunning = null, timerDeadline = null, timerShown = null;
const audio = $("timer-audio");

const playSounds = (()=>{
  let queue = [];
  const playNext = ()=> {
    if (audio.paused && queue.length) {
      const next = queue.pop();
      if (typeof next === "function") { next(); return playNext(); }
      audio.src = next;
      audio.play();
    }
  };
  audio.addEventListener("ended", playNext);
  return (...what) => {
    audio.pause();
    audio.currentTime = 0;
    audio.src = "";
    queue = what.reverse();
    playNext();
  };
})();

const timerUpdate = ()=> {
  const show = Math.ceil((timerDeadline - Date.now()) / 1000);
  if (timerShown === show) return;
  const pad2 = n => n < 10 ? "0"+n : n;
  const tDiv = $("timer");
  const setText = txt => {
    tDiv.innerHTML = `<div>${txt}</div>`;
    tDiv.style.width = tDiv.children[0].getBoundingClientRect().width + "px";
  }
  timerShown = show;
  enablePleeze = show <= 10 ? 2 : show <= 20 ? 1 : 0;
  if (show === 20) quietPlease();
  audio.volume = show > 10 ? 0 : Math.min((10-show)**2/500, 1);
  if (1 <= show && show <= 10) playSounds("tick.mp3");
  else if (show == 0 && audio.paused) {
    const big = tDiv.classList.contains("big") ? "-big" : "";
    playSounds("tick.mp3", `alarm${big}.mp3`, `over${big}.mp3`,
               timerAdd(0));
  }
  if (show >= 0) {
    tDiv.classList.remove("over");
    setText(show<60 ? show : Math.floor(show/60)+":"+pad2(show%60));
  } else if (show >= -8) {
    tDiv.classList.add("over");
    const bzz = ["Fr", "Frr", "Frrr", "Frrrr",
                 "FRrrr", "FRRrr", "FRRRr", "FRRRR"];
    setText("!!!"+bzz[Math.min((-show-1), bzz.length-1)]+"!!!");
  }
};
let quickAdjustTotal = 0;
const timerAdd = d => ()=> {
  if (!isSudo()) return;
  const now = Date.now();
  if (!timerDeadline && d < 0) return;
  if (!timerDeadline || (now + quickAdjustTotal - timerDeadline) < 2000) {
    quickAdjustTotal += 30000 * d;
    timerDeadline = now + quickAdjustTotal;
  } else {
    quickAdjustTotal = Infinity;
    timerDeadline += 10000 * d;
  }
  const showTime = timerDeadline > now;
  if (!!timerRunning === showTime) return;
  const tDiv = $("timer");
  tDiv.classList.toggle("active", showTime);
  tDiv.classList.remove("over");
  tDiv.style.opacity = 0;
  tDiv.style.width = "";
  timerUpdate();
  setTimeout(()=> tDiv.style.opacity = 0.9, 100);
  if (showTime) {
    return timerRunning = setInterval(timerUpdate, 100);
  } else {
    clearInterval(timerRunning);
    timerRunning = null;
    timerDeadline = null;
    enablePleeze = 0;
    playSounds();
    quickAdjustTotal = 0;
  }
};

const hotKeys = new Map([
  ["t",         ["keyup",   ()=> curText.focus()]],
  ["l",         ["keyup",   toggleLogin]],
  ["s",         ["keyup",   toggleEditor]],
  ["d",         ["keyup",   editorDone]],
  ["f",         ["keyup",   ()=> isSudo() && send(opWrap("Feedback"))]],
  ["ArrowUp",   ["keydown", timerAdd(1)]],
  ["ArrowDown", ["keydown", timerAdd(-1)]],
  ["PageUp",    ["keydown", timerAdd(+2)]],
  ["PageDown",  ["keydown", timerAdd(-2)]],
  ["+",         ["keyup",   ()=> $("timer").classList.add("big")]],
  ["=",         ["keyup",   ()=> $("timer").classList.add("big")]],
  ["-",         ["keyup",   ()=> $("timer").classList.remove("big")]]
]);

const keyHandler = e => {
  if (!(e.altKey && !e.shiftKey && !e.ctrlKey)) return;
  const keydef = hotKeys.get(e.key);
  if (!keydef) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.type === keydef[0]) keydef[1]();
};
window.addEventListener("keydown", keyHandler, true);
window.addEventListener("keyup",   keyHandler, true);

const setupInputMode = mode => {
  toggleEditor(true);
  curText.placeholder = inputModes[mode];
  curText.value = "";
  curText.dataset.type = mode;
  curText.classList.add("input-mode");
  $("thetext-done").style.display = "none";
  hotKeys.clear();
};

const inputMode = Object.keys(inputModes).find(s => location.href.includes(s));

window.addEventListener("load", ()=> {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(
      window.location.href.replace(/\/[^\/]*$/, "/worker.js"))
    .then(reg => console.log(`ServiceWorker registered for: ${reg.scope}`),
          err => console.log(`ServiceWorker failure: ${err}`));
  }
  if (inputMode) return setupInputMode(inputMode);
  setButtons();
  setTimeout(startWS, 100);
});

let installEvt = null;
window.addEventListener("beforeinstallprompt", e => {
  $("install").style.display = "block";
  installEvt = e;
});
evListener("install", "click", ()=> setTimeout(()=> {
  if (!installEvt) return;
  console.log("Installing...");
  $("install").style.display = "none";
  installEvt.prompt();
  installEvt.userChoice.then(res => {
    console.log(`User ${res.outcome} the install prompt`);
    installEvt = null;
  });
}, 250));

// ----------------------------------------------------------------------------

let cmarkScript = null, cmark = null;
const loadCMark = c => {
  if (cmarkScript && cmark) return c();
  if (cmarkScript) return; // still loading: ignore
  cmarkScript = Object.assign(document.createElement("script"), {
    src: "https://cdnjs.cloudflare.com/ajax/libs/commonmark/0.29.3/commonmark.min.js",
    integrity: "sha512-Mq6HFo4kQ6yog5IKk+MflA4KRIB966kfsdk9NpuM1dUOZOcuGEJMVMXeFzTNIXvrzCIOt7t/rmBZOsgkR7IY7w==",
    crossOrigin: "anonymous", referrerPolicy: "no-referrer",
  });
  cmarkScript.addEventListener("load", ()=> {
    const Parser = new commonmark.Parser({smart: true}), parse  = Parser.parse.bind(Parser),
          Renderer = new commonmark.HtmlRenderer(),      render = Renderer.render.bind(Renderer);
    cmark = Object.assign(commonmark, { parse, render });
    return c();
  });
  document.head.append(cmarkScript);
};

const rendered = $("thetext-rendered");
const mdShown = () => rendered.classList.contains("active");
const mdRender = () => loadCMark(() => {
  rendered.classList.add("active");
  let text = curText.value;
  text = text.replace(/^ *(\+)?-+(=+|:+)-+ *$/gm, (_, multi, __) =>
    `\n<div class="sep">${multi ? "multiple choice" : ""}</div>\n`);
  text = cmark.parse(text);
  text = cmark.render(text);
  text = text.replace(/<li>(\s*(?:<p>)?\s*)\[([^\[\]]+)\] */g, (_, pfx, lbl) =>
      `<li class="labeled" data-label="${lbl}"><label><div>${
        lbl}</div></label>${pfx}`),
  rendered.innerHTML = text;
  // adjust indentation to accomodate labels
  setTimeout(()=> {
    const w = Math.max(...[...rendered.querySelectorAll("ul li label div")]
                       .map(l => l.offsetWidth));
    rendered.style.setProperty("--li-indent", w + "px");
  }, 10);
});
const mdClose = () => {
  curText.focus();
  rendered.classList.remove("active");
}
const mdToggle = () => mdShown() ? mdClose() : mdRender();
