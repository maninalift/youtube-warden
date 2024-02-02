/* This runs after a web page loads */
window.onload = init;


//let allowedChannels = [
//  { id: "RelaxationChannel" }
//];


//let allowedVids = [
//  { id: "LCfH6A0BBvw" }
//];



// TODO:   syc
//
// TODO: allow channel
// TODO: allow Video
//
// TODO: unblock everything for specific amount of time
//
// TODO: allow channel for specific amount of time 
// TODO: allow video for specific amount of time
//
//  TODO:set timeout to re-check page
//
//  TODO: handle others ways videos might playe 
//           - the pop-out player
//           - playing in preview
//
// TODO: handle shorts 
//           - separate approval for shorts and longs for a channel
//
//TODO: abstract away repeated code between allowVideo and allowChannel
//
//TODO: edit existing allow list
//
//
//TODO: better password input
//
//
//TODO: options page
//        - password secured
//        - password change
//        - individual record deletion
//        - clear all records


let currentApprovedVideoId: string | null = null;

type AllowKind = "all" | "channel" | "video";

type AllowRecord = {
  id: string,
  name: string,
  expiry?: number
};

type AllowRecordWriter = { "all": AllowRecord } | { "channel": AllowRecord } | { "video": AllowRecord };

function getParameterByName(name: string, url = window.location.href) {
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// WARN:
// DON'T COPY THIS CODE FOR SENSITIVE APPLICATIONS
// for a YT video blocker this may be fine 
//1/but it's not the right way to do crypto
/////////////////////////////////////////////////////////////
async function hashPassword(password: string, salt: string) {
  const pwd_data = (new TextEncoder).encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-512", pwd_data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

async function setPassword(password: string) {
  let salt = crypto.randomUUID();

  let passwordRecord = {
    salt: salt,
    hash: (await hashPassword(password, salt)),
  };

  console.log(passwordRecord);

  await chrome.storage.sync.set({ password: passwordRecord });
}

async function hasPassword() {
  let passwordRecord = (await chrome.storage.sync.get("password")).password;
  console.log("found record:");
  console.log(passwordRecord);
  return !!(passwordRecord);
}

async function checkPassword(password: string) {
  let passwordRecord = (await chrome.storage.sync.get("password")).password;
  if (!passwordRecord) return false;
  let thisHash = hashPassword(password, passwordRecord.salt);
  return (thisHash == passwordRecord.hash);
}

async function getAllowed(kind: AllowKind) {
  let listKey = kind + "_list";
  let allowedList = (await chrome.storage.sync.get(listKey))[listKey];
  if (!allowedList) {
    allowedList = [];
    let data = { [listKey]: allowedList };
    chrome.storage.sync.set(data);
  }
  return allowedList;
}

async function isAllowed(kind: AllowKind, id: string) {
  let allowedList = await getAllowed(kind);

  let allowedRecord = allowedList.find((x: AllowRecord) => x.id == id);
  if (!allowedRecord) return false;
  if (allowedRecord.expiry && allowedRecord.expiry < Date.now()) {
    return false;
  }
  if (allowedRecord.expiry) {
    // if ther is an expiry on the record, re-check the page one second after the expiry time
    currentApprovedVideoId = null;
    setTimeout(securePage, allowedRecord.expiry - Date.now() + 1000);
  }
  console.log("IS ALLOWED " + kind + " : " + id);
  return true;
}

async function allow(kind: string, id: string, name: string) {
  let listKey = kind + "_list";
  let allowedList = (await chrome.storage.sync.get(listKey))[listKey];
  if (!allowedList) allowedList = [];

  allowedList.push({
    id: id,
    name: name
  });
  let data = { [listKey]: allowedList };
  await chrome.storage.sync.set(data);

  document.location.reload();
}

function blockWatchPage(videoId: string, channelId: string) {
  let app = document.getElementsByTagName("ytd-app")[0];
  app.innerHTML = `
                 <div id="yt-police-modal" class="modal">
                   <h1>You can't go there</h1>
                   <div id="give-up">
                     <div class="btn-group">
                       <button id="go-back-btn">Go Back</button>
                       <button id="go-home-btn">Go Home</button>
                     </div>
                   </div>
                  <div class = "seperator"></div>
                   <div id="allow-content">
                     <div class="btn-group">
                       <button id="allow-video-btn">Allow Video</button>
                       <button id="allow-channel-btn">Allow Channel</button>
                       <button id="allow-all-btn">Allow All</button>
                     </div>
                    <div id="time-limit">
                      <input type="checkbox" id="is-limited" name="is-limited" >
                      <label for="is-limited">Time limit</label><br>
                       <input type="days" id="days" name="days" min="0" max="100" value="0" />
                       <input type="hours" id="hours" name="hours" min="0" max="23" value="0"/>
                       <input type="mins" id="mins" name="mins" min="0" max="59" value ="0" />
                     </div>
                     <input type="password" id="password" name="password" placeholder="Enter password">
                   </div>
                 </input>             
                 `;

  document.querySelector("button#go-home-btn")?.addEventListener("click", () => { window.location.href = window.location.origin; });
  //document.querySelector("button#go-back-btn").addEventListener("click", () => { window.history.back(); window.location.reload(); });
  document.querySelector("button#allow-video-btn")?.addEventListener("click", () => {
    allow("video", videoId, "UNKNOWN");
    // check password
    // add time limit
  });
  document.querySelector("button#allow-channel-btn")?.addEventListener("click", () => {
    allow("channel", channelId, "UNKNOWN");
    // check password
    // add time limit
  });
  document.querySelector("button#allow-all-btn")?.addEventListener("click", () => {
    allow("all", "all", "all");
    // check password
    // add time limit
  });
}

async function canWatch(videoId: string, channelId: string) {
  if (await isAllowed("all", "all")) return true;
  if (await isAllowed("channel", channelId)) return true;
  if (await isAllowed("video", videoId)) return true;
  return false;
}


async function secureWatchPage() {
  let channelLink = document.querySelector("ytd-watch-metadata #channel-name a");
  let channelHref = channelLink && channelLink.getAttribute("href");
  let channelId = channelHref && (new URL(channelHref, window.location.origin)).pathname;

  let vidIdEl = document.querySelector("[video-id]:has(video.html5-main-video)")
  let videoId = vidIdEl && vidIdEl.getAttribute("video-id");

  if (!channelId || !videoId) { stopAllVideo(); return; }

  if (videoId == currentApprovedVideoId) return;

  if (await canWatch(videoId, channelId)) {
    currentApprovedVideoId = videoId;
    return;
  }

  blockWatchPage(videoId, channelId);
}

function stopAllVideo() {
  //document.querySelectorAll(".html5-video-player").forEach((x) => { x.remove(); })
  document.querySelectorAll("video").forEach((vid) => { vid.pause(); console.log("preventing playback") })
}


async function securePage() {
  let page = document.location.pathname;
  let area = page.split("/")[1];


  if (area === "shorts") {
    window.location.href = window.location.origin;
    return;
  };

  if (area === "watch") {
    secureWatchPage();
    return;
  }

  // channel
  // feed
  // ...

  stopAllVideo();
  return;
}

// TODO:fix this
async function confirmPasswordSetup() {
  let needPassword = !(await hasPassword());
  if (needPassword) {
    let password = prompt("set a password") || "password123";
    setPassword(password);
  }
}


function init() {
  confirmPasswordSetup();

  let body = document.querySelector("body");
  if (!body) return;

  securePage();

  let observer = new MutationObserver(securePage);
  let config = {
    childList: true,
    subtree: true,
  };
  observer.observe(body, config);
}
