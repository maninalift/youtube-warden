import { allow, canWatch, checkPassword, hasPassword, setPassword, getParameterByName, type AllowKind, type Info } from './common';

window.onload = init;

// TODO: handle shorts 
//           - make exclude-shorts work ?
//
//TODO: options page
//        - individual record deletion
//        - clear all records
//        - CSS tabs
//        - table sorting
//        - styling
//
//TODO: password creation form styling
//
//TODO: remove cosole.logs and commented code
//
//TODO: add data_version = 1 to the chrome.store.local

type Poisin = { poisined: boolean };
let currentApproval: { id: string, status: "approved" | "blocked" } | { id: string, status: "checking", poisin: Poisin } | null = null;

//let checking = false;

function reCheckPage() {
  if (currentApproval?.status == "checking") currentApproval.poisin.poisined = true;
  currentApproval = null;
  securePage();
}

function getInjectNode() {
  let injectNode = document.querySelector("#yt-warden-inject");
  if (injectNode) return injectNode;


  injectNode = document.createElement("div");
  injectNode.id = "yt-warden-inject";

  const body = <Element>document.querySelector("body");

  body.insertAdjacentElement("afterbegin", injectNode);

  return injectNode;
}

function stopYTApp() {
  document.querySelector("ytd-app")?.toggleAttribute("hidden", true);
  stopAllVideo();
}

function blockWatchPage(video: Info, channel: Info, playlist: Info | null) {

  let injectNode = getInjectNode();

  stopYTApp();

  injectNode.innerHTML = `
                 <div id="yt-warden-modal" class="modal yt-warden-content">
                   <h1>You can't go there</h1>
                   <div id="give-up">
                     <div class="btn-group">
                       <button id="go-home-btn">Go Home</button>
                       <button id="go-back-btn">Go Back</button>
                     </div>
                   </div>
                   <div class = "seperator"></div>
                   <div id="allow-content">
                     <div id='error-message'></div>
                     <div class="btn-group">
                       <input type="password" id="password" name="password" placeholder="Enter password">
                     </div>
                     <div class="btn-group">
                       <div id="time-limit-input"> 
                         <span>Time limit: </span>
                         <input type="number" id="days" name="days" min="0" max="100" value="" placeholder="d"/>
                         <input type="number" id="hours" name="hours" min="0" max="23" value="" placeholder="h"/>
                         <input type="number" id="mins" name="mins" min="0" max="59" value ="" placeholder="m"/>
                       </div>
                     </div>
                     <div class="btn-group">
                       <label for="exclude-shorts"><input type="checkbox" id="exclude-shorts" name="exclude-shorts" value="exclude-shorts">Exclude shorts</label>
                     </div>
                     <div class="btn-group">
                       <p><b>Allow video: </b>${video.name}</p>
                       <button id="allow-video-btn" class="serious">Allow Video</button>
                       <p><b>Allow channel: </b><a target='_blank' href="/${channel.id}">${channel.name}</a></p>
                       <button id="allow-channel-btn" class="serious">Allow Channel</button>
                       <p><b>Allow ALL content</b> (requres a time limit)</p>
                       <button id="allow-all-btn" class="serious">Allow All</button>
                       ${playlist ? ("<p><b>Allow Playlist:</b> " + playlist.name + "</p>") : ""}
                       ${playlist ? "<button id='allow-playlist-btn' class='serious'>Allow Playlist</button>" : ""}
                     </div>
                   </div>
                 </div>             
                 `;


  const homeBtn = document.querySelector("button#go-home-btn");
  homeBtn?.addEventListener("click", () => { window.location.href = window.location.origin; });

  const backBtn = document.querySelector("button#go-back-btn");
  backBtn?.addEventListener("click", () => { window.history.back(); });

  const vidBtn = document.querySelector("button#allow-video-btn");
  vidBtn?.addEventListener("click", createAllowButtonHandler("video", video.id, video.name));

  if (playlist) {
    const playlistBtn = document.querySelector("button#allow-playlist-btn");
    playlistBtn?.addEventListener("click", createAllowButtonHandler("playlist", playlist.id, playlist.name));
  }

  const channelBtn = document.querySelector("button#allow-channel-btn");
  channelBtn?.addEventListener("click", createAllowButtonHandler("channel", channel.id, channel.name));

  const allBtn = document.querySelector("button#allow-all-btn");
  allBtn?.addEventListener("click", createAllowButtonHandler("all", "all", "Everything"));

  const timeInputs = (<NodeListOf<HTMLInputElement>>document.querySelectorAll("#time-limit-input input[type=number]"));
  timeInputs.forEach(input => {
    input.addEventListener("input", inputStatusUpdate);
  });

  const passwordInput = (<HTMLInputElement>document.querySelector("#allow-content input[type=password]"));
  passwordInput?.addEventListener("input", inputStatusUpdate);

  inputStatusUpdate();

  function inputStatusUpdate() {
    let hasTimeInput = false;
    timeInputs.forEach(input => {
      if (input.value && (Number(input.value) > 0)) hasTimeInput = true;
    });
    let hasPasswordInput = !!(passwordInput?.value);
    document.querySelector("#time-limit-input")?.classList.toggle("has-input", hasTimeInput);
    document.querySelector("#allow-video-btn")?.toggleAttribute("disabled", !hasPasswordInput);
    //if (playlist)
    document.querySelector("#allow-playlist-btn")?.toggleAttribute("disabled", !hasPasswordInput || !playlist);
    document.querySelector("#allow-channel-btn")?.toggleAttribute("disabled", !hasPasswordInput);
    document.querySelector("#allow-all-btn")?.toggleAttribute("disabled", !hasTimeInput || !hasPasswordInput);
  }
}



function createAllowButtonHandler(kind: AllowKind, id: string, name: string) {
  return async (_: Event) => {

    const passwordInput = <HTMLInputElement>document.querySelector("#yt-warden-modal input#password");
    const errEl = document.querySelector("#yt-warden-modal #allow-content #error-message");

    if (!passwordInput || !errEl) { console.error("Missing HTML elements in allow modal."); return; }

    const password = passwordInput.value;
    if (!password) {
      alert("You need to enter the password!");
      return;
    }

    const days = Number((<HTMLInputElement>document.querySelector("#yt-warden-modal #days"))?.value) || 0;
    const hours = Number((<HTMLInputElement>document.querySelector("#yt-warden-modal #hours"))?.value) || 0;
    const mins = Number((<HTMLInputElement>document.querySelector("#yt-warden-modal #mins"))?.value) || 0;

    const allowMins = mins + 60 * (hours + 24 * days);

    if (allowMins == 0 && kind === "all") {
      errEl.innerHTML = `<div class='error-message'>You must include a time limit when unblocking all content!</div>`;
      setTimeout(() => { errEl.innerHTML = ''; }, 2000);
      return;
    }

    const expiry = (allowMins === 0) ? null : (Date.now() + allowMins * 60 * 1000);
    const passwordResult = await checkPassword(password);
    if (!passwordResult.ok) {
      if (passwordResult.reason == "timeout") {
        updatePasswordRetryBlock();
        let interval = setInterval(updatePasswordRetryBlock, 1000);
        function updatePasswordRetryBlock() {
          const delay = passwordResult.timeout - Date.now();
          if (delay <= 0) {
            if (errEl) errEl.innerHTML = '';
            clearInterval(interval);
            return;
          }
          const seconds = ~~((delay + 999) / 1000) % 60;
          const minutes = ~~((delay + 999) / (60 * 1000));
          const secondsText = (seconds > 0) ? ` ${seconds} seconds` : "";
          const minutesText = (minutes > 0) ? ` ${minutes} minutes` : "";
          if (errEl) errEl.innerHTML = `<div class='error-message'>Too many password attempts, try again in${minutesText}${secondsText}!</div>`;
        }
      }
      if (passwordResult.reason == "password") {
        passwordInput.value = "";
        errEl.innerHTML = `<div class='error-message'>Password incorrect!</div>`;
        setTimeout(() => { errEl.innerHTML = ''; }, 2000);
      }
      if (passwordResult.reason == "not-set") {
        errEl.innerHTML = `<div class='error-message'>password not set!</div>`;
        setTimeout(() => { errEl.innerHTML = ''; }, 2000);
      }
      return;
    }

    await allow(kind, id, name, expiry);

    reCheckPage();
  }
}

function removeBlockingOverlay() {
  //currentBlockedApprovalId = null;
  let injectNode = getInjectNode();
  injectNode.innerHTML = '';
  document.querySelector("ytd-app")?.removeAttribute("hidden");

}

function unblockWatchPage() {
  removeBlockingOverlay();
  playMainVideo();
}

function getChannelInfo(): Info | null {
  const href = document.querySelector("#content ytd-watch-metadata #channel-name a")?.getAttribute("href");
  const id = href && (new URL(href, window.location.origin)).pathname?.slice(1);
  const name = document.querySelector("#content ytd-watch-metadata #channel-name a")?.textContent || "Unknown";
  if (!id) return null;
  return { id, name };
}

function getVideoInfo(): Info | null {
  const id = document.querySelector("#content [video-id]:has(video.html5-main-video)")?.getAttribute("video-id");
  const name = document.querySelector("#content ytd-watch-metadata #title")?.textContent?.trim() || "Unknown";
  if (!id) return null;
  return { id, name }
}


function getPlaylistInfo(videoId: string): Info | null {
  // the selected playlist item should be the currently playing item this prevents someone from manually setting the video id in the URL
  // to a video that is not in playlist
  const selectedPlaylistItem = document.querySelector("#content ytd-playlist-panel-renderer ytd-playlist-panel-video-renderer[selected]");
  const selectedPlaylistItemHref = selectedPlaylistItem?.querySelector("a#wc-endpoint")?.getAttribute("href")
  if (!selectedPlaylistItemHref) return null;
  const selectedPlaylistItemId = getParameterByName("v", selectedPlaylistItemHref);
  if (!selectedPlaylistItemId) return null;
  if (videoId !== selectedPlaylistItemId) return null;

  const playListLink = document.querySelector("#content ytd-playlist-panel-renderer .header .title a");
  const playListHref = playListLink?.getAttribute("href");
  console.log(playListHref);
  if (!playListHref) return null;
  const id = getParameterByName("list", playListHref);
  console.log(id);
  if (!id) return null;

  let name = playListLink?.textContent || "Unknown";

  return { id, name };
}

function getApprovalId(video: Info, channel: Info, playlist: Info | null) {
  if (!playlist) return `${video.id}&${channel.id}`;
  return `${video.id}&${channel.id}&${playlist.id}`;
}

async function secureWatchPage() {
  const channel = getChannelInfo();
  const video = getVideoInfo();

  if (!channel || !video) {
    console.log(`missing info`);
    stopMainVideo();
    return;
  }

  const playlist = getPlaylistInfo(video.id);
  const approvalId = getApprovalId(video, channel, playlist);

  // checking approved or blocked this same item
  if (approvalId === currentApproval?.id) {
    console.log(`already ${currentApproval.status} ${currentApproval.id}`);
    if (currentApproval.status === "approved") return;
    stopMainVideo();
    return;
  }

  // if checking a different item, cancel it
  if (currentApproval?.status === "checking") {
    console.log(`cancelling ${currentApproval.id}`);
    currentApproval.poisin.poisined = true;
  }

  const myPoisin = { poisined: false };
  currentApproval = { id: approvalId, status: "checking", poisin: myPoisin };

  const canWatchRecord = await canWatch(video.id, channel.id, (playlist && playlist.id));

  if (myPoisin.poisined) return;

  if (!canWatchRecord.ok) {
    console.log(`BLOCKING ${approvalId}`);
    currentApproval = { id: approvalId, status: "blocked" };
    blockWatchPage(video, channel, playlist);
    return;
  };

  if (canWatchRecord.expiry) {
    setTimeout(reCheckPage, canWatchRecord.expiry - Date.now() + 1000);
  }
  console.log(`VIDEO [${video.id}] IS ALLOWED`);
  currentApproval = { id: approvalId, status: "approved" };
  unblockWatchPage();
}

function playMainVideo() {
  (<NodeListOf<HTMLVideoElement>>document.querySelectorAll("video.html5-main-video")).forEach((vid) => { vid.play(); })
}

function stopMainVideo() {
  (<NodeListOf<HTMLVideoElement>>document.querySelectorAll("video.html5-main-video")).forEach((vid) => { vid.pause(); })
}

function stopAllButMainVideo() {
  (<NodeListOf<HTMLVideoElement>>document.querySelectorAll("video:not(.html5-main-video)")).forEach((vid) => { vid.pause(); })
}

function stopAllVideo() {
  (<NodeListOf<HTMLVideoElement>>document.querySelectorAll("video")).forEach((vid) => { vid.pause(); })
}

async function securePage() {
  stopAllButMainVideo();

  const area = document.location.pathname.split("/")[1];

  if (area === "shorts") {
    //window.location.href = window.location.origin;
    secureWatchPage();
    return;
  };

  if (area === "watch") {
    secureWatchPage();
    return;
  }

  removeBlockingOverlay();
  stopMainVideo();
  return;
}

async function confirmPasswordSetup() {
  if (await hasPassword()) return;
  stopYTApp();
  const injectNode = getInjectNode();
  injectNode.innerHTML = `
                 <div id="yt-warden-modal" class="modal yt-warden-content">
                   <h1>Welocome to YouTube Warden</h1>
                   <p>Please Read the documentation for features and limitation.</p>
                   <p>You need to create a password</p>

                   <form id="pwd-set-form">
                     <input type="password" id="password" name="password" minlength="8" placeholder="password (minimum 8 characters)" required />
                     <br>
                     <input type="password" id="confirm-password" name="confirm password" placeholder="confirm password"  minlength="8" required />
                     <input type="submit" value="Set Password">
                   </input>
                  
                 </div>             
                 `;
  injectNode.querySelector("#yt-warden-modal form")?.addEventListener("submit", handlePasswordFormSubmit);
}

function handlePasswordFormSubmit(e: Event) {
  e.preventDefault();
  const form = document.querySelector("#yt-warden-modal form#pwd-set-form");
  if (!form) return;
  const pwdInput = <HTMLInputElement>form.querySelector("input#password");
  const pwdConfirmInput = <HTMLInputElement>form.querySelector("input#confirm-password");
  const password = pwdInput?.value;
  const passwordConfirm = pwdConfirmInput?.value;

  if (!password) {
    pwdInput?.setAttribute("error", "true");
    return;
  }

  if (!passwordConfirm) {
    pwdConfirmInput?.setAttribute("error", "true");
    return;
  }

  if (password !== passwordConfirm) {
    pwdConfirmInput?.setAttribute("error", "true");
    pwdInput?.setAttribute("error", "true");
    return;
  }

  if (password.length < 8) {
    pwdConfirmInput?.setAttribute("error", "true");
    pwdInput?.setAttribute("error", "true");
    return;
  }

  setPassword(password);
  document.location.reload();
}

function init() {
  // chrome.storage.local.clear();

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
