import { canWatch, setPassword, checkPassword, hasPassword, allow, type AllowKind } from './common';

window.onload = init;

// TODO: handle shorts 
//           - separate approval for shorts and longs for a channel
//
//
//TODO: options page
//        - password secured
//        - password change
//        - individual record deletion
//        - clear all records
//
//TODO: prevent repeated password guessing
//
//TODO: stop any other videos on the video play page 
//
//TODO: find a way to cut out (even more of) the redundant checks 
//      and just check the watch page once.

let currentApprovedVideoId: string | null = null;

function reCheckPage() {
  currentApprovedVideoId = null;
  securePage();
}

function blockWatchPage(videoId: string, channelId: string, videoTitle: string, channelName: string) {
  const app = document.getElementsByTagName("ytd-app")[0];
  app.innerHTML = `
                 <div id="yt-warden-modal" class="modal yt-warden-content">
                   <h1>You can't go there</h1>
                   <div id="give-up">
                     <div class="btn-group">
                       <button id="go-home-btn">Go Home</button>
                     </div>
                   </div>
                  <div class = "seperator"></div>
                   <div id="allow-content">
                     <input type="password" id="password" name="password" placeholder="Enter password">
                     <div class="btn-group">
                       <div id="time-limit-input">
                         <span>Time limit: </span>
                         <input type="number" id="days" name="days" min="0" max="100" value="" placeholder="d"/>
                         <input type="number" id="hours" name="hours" min="0" max="23" value="" placeholder="m"/>
                         <input type="number" id="mins" name="mins" min="0" max="59" value ="" placeholder="s"/>
                       </div>
                     </div>
                     <div class="btn-group">
                       <p><b>Allow video: </b>${videoTitle}</p>
                       <button id="allow-video-btn">Allow Video</button>
                       <p><b>Allow channel: </b><a href="/${channelId}">${channelName}</a></p>
                       <button id="allow-channel-btn">Allow Channel</button>
                       <p><b>Allow ALL content</b> (requres a time limit)</p>
                       <button id="allow-all-btn">Allow All</button>
                     </div>
                   </input>
                 </div>             
                 `;


  document.querySelector("button#go-home-btn")?.addEventListener("click", () => { window.location.href = window.location.origin; });
  //document.querySelector("button#go-back-btn").addEventListener("click", () => { window.history.back(); window.location.reload(); });

  document.querySelector("button#allow-video-btn")?.addEventListener("click", createAllowButtonHandler("video", videoId, videoTitle));
  document.querySelector("button#allow-channel-btn")?.addEventListener("click", createAllowButtonHandler("channel", channelId, channelName));
  document.querySelector("button#allow-all-btn")?.addEventListener("click", createAllowButtonHandler("all", "all", "Everything"));

  (<NodeListOf<HTMLInputElement>>document.querySelectorAll("#time-limit-input input[type=number]")).forEach(input => {
    input.addEventListener("input", timeLimitStatusUpdate);
  });
}

function timeLimitStatusUpdate() {
  let hasInput = false;
  (<NodeListOf<HTMLInputElement>>document.querySelectorAll("#time-limit-input input[type=number]")).forEach(input => {
    if (input.value && (Number(input.value) > 0)) hasInput = true;
    console.log(input.value);
  });
  document.querySelector("#time-limit-input")?.classList.toggle("has-input", hasInput);
}

function createAllowButtonHandler(kind: AllowKind, id: string, name: string) {
  return async (_: Event) => {

    const password = (<HTMLInputElement>document.querySelector("#yt-warden-modal input#password"))?.value;

    if (!(await checkPassword(password))) {
      alert("password incorrect!");
      return;
    }

    const days = Number((<HTMLInputElement>document.querySelector("#yt-warden-modal #days"))?.value) || 0;
    const hours = Number((<HTMLInputElement>document.querySelector("#yt-warden-modal #hours"))?.value) || 0;
    const mins = Number((<HTMLInputElement>document.querySelector("#yt-warden-modal #mins"))?.value) || 0;

    const allowMins = mins + 60 * (hours + 24 * days);

    if (allowMins == 0 && kind === "all") {
      alert("You must include a time limit when unblocking all content!");
      return;
    }

    const expiry = (allowMins === 0) ? null : (Date.now() + allowMins * 60 * 1000);

    await allow(kind, id, name, expiry);

    document.location.reload();
  }
}


async function checkVideoAcceess(videoId: string, channelId: string) {
  if (videoId == currentApprovedVideoId) return true;

  const canWatchRecord = await canWatch(videoId, channelId);

  if (!canWatchRecord) return false;

  if (canWatchRecord.expiry) {
    // if ther is an expiry on the record, re-check the page one second after the expiry time
    currentApprovedVideoId = null;
    setTimeout(reCheckPage, canWatchRecord.expiry - Date.now() + 1000);
  }
  currentApprovedVideoId = videoId;

  return true;
}

let checking = false;

async function secureWatchPage() {
  // since function is async and may be called on every page 
  // modification, we guard to prevent it from being run 
  // multiple times simultaniously
  if (checking) {
    stopMainVideo();
    return;
  }
  checking = true;

  const channelHref = document.querySelector("ytd-watch-metadata #channel-name a")?.getAttribute("href");
  const channelId = channelHref && (new URL(channelHref, window.location.origin)).pathname?.slice(1);
  const channelName = document.querySelector("ytd-watch-metadata #channel-name a")?.textContent || "Unknown";

  const videoId = document.querySelector("[video-id]:has(video.html5-main-video)")?.getAttribute("video-id");
  const videoTitle = document.querySelector("ytd-watch-metadata #title")?.textContent?.trim() || "Unknown";

  if (!channelId || !videoId) { stopMainVideo(); checking = false; return; }


  if (await checkVideoAcceess(videoId, channelId)) {
    checking = false;
    return;
  }

  blockWatchPage(videoId, channelId, videoTitle, channelName);
  checking = false;
}

function stopMainVideo() {
  (<NodeListOf<HTMLVideoElement>>document.querySelectorAll("video.html5-main-video")).forEach((vid) => { vid.pause(); })
}

function stopAllButMainVideo() {
  (<NodeListOf<HTMLVideoElement>>document.querySelectorAll("video:not(.html5-main-video)")).forEach((vid) => { vid.pause(); })
}

async function securePage() {
  stopAllButMainVideo();

  const area = document.location.pathname.split("/")[1];

  if (area === "shorts") {
    window.location.href = window.location.origin;
    return;
  };

  if (area === "watch") {
    secureWatchPage();
    return;
  }

  stopMainVideo();
  return;
}

async function confirmPasswordSetup() {
  if (await hasPassword()) return;
  const app = document.getElementsByTagName("ytd-app")[0];
  app.innerHTML = `
                 <div id="yt-warden-modal" class="modal yt-warden-content">
                   <h1>Welocome to YouTube Warden</h1>
                   <p>Please Read the documentation for features and limitation.</p>
                   <p>You need to create a password</p>

                   <form id="pwd-set-form">
                     <input type="password" id="password" name="password" minlength="8" placeholder="password (minimum 8 characters)" required />
                     <input type="password" id="confirm-password" name="confirm password" placeholder="confirm password"  minlength="8" required />
                     <input type="submit" value="Set Password">
                   </input>
                  
                 </div>             
                 `;
  app.querySelector("#yt-warden-modal form")?.addEventListener("submit", handlePasswordFormSubmit);
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
