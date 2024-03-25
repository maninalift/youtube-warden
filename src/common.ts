// WARN:
// DON'T COPY THIS CODE 
// while suitible for a YT video blocker extension
// this should not be taken as a model for secure 
// cryptography
/////////////////////////////////////////////////////////////
export async function hashPassword(password: string, salt: string) {
  const pwdData = (new TextEncoder).encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-512", pwdData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export type Info = { id: string, name: string };

type PasswordRecord = {
  salt: string,
  hash: string,
  timeout: number,
  consecutiveFailures: number,
  lastTimeout: number
}

export async function clearPassword() {
  await chrome.storage.local.remove("password");
}

export async function setPassword(password: string) {
  const salt = crypto.randomUUID();
  const passwordRecord: PasswordRecord = {
    salt: salt,
    hash: (await hashPassword(password, salt)),
    timeout: 0,
    consecutiveFailures: 0,
    lastTimeout: 0
  };

  await chrome.storage.local.set({ password: passwordRecord });
}

export async function hasPassword() {
  const passwordRecord = (await chrome.storage.local.get("password")).password;
  return !!(passwordRecord);
}


// the order highest to lowest threshold is required
const passwordTimeouts = [
  { threshold: 20, frequency: 2, timeout: 30 * 60 * 1000 },
  { threshold: 10, frequency: 2, timeout: 5 * 60 * 1000 },
  { threshold: 4, frequency: 2, timeout: 60 * 1000 },
];


export async function checkPassword(password: string) {
  let passwordRecord = (await chrome.storage.local.get("password")).password;
  if (!passwordRecord) return { ok: false, reason: "not-set" };
  if (passwordRecord.timeout > Date.now()) return { ok: false, reason: "timeout", timeout: passwordRecord.timeout, consecutiveFailures: passwordRecord.consecutiveFailures }
  const thisHash = await hashPassword(password, passwordRecord.salt);
  if (thisHash != passwordRecord.hash) {
    passwordRecord.consecutiveFailures += 1;
    const timeout = passwordTimeouts.find((pt) => (passwordRecord.consecutiveFailures >= pt.threshold));
    if (timeout && (passwordRecord.consecutiveFailures - passwordRecord.lastTimeout >= timeout.frequency)) {
      passwordRecord.lastTimeout = passwordRecord.consecutiveFailures;
      passwordRecord.timeout = Date.now() + timeout.timeout;
    }
    chrome.storage.local.set({ password: passwordRecord });
    return { ok: false, reason: "password", timeout: passwordRecord.timeout, consecutiveFailures: passwordRecord.consecutiveFailures };
  }
  if (passwordRecord.consecutiveFailures > 0) {
    passwordRecord.consecutiveFailures = 0;
    passwordRecord.lastTimeout = 0;
    chrome.storage.local.set({ password: passwordRecord });
  }
  return { ok: true };
}

export function getParameterByName(name: string, url = window.location.href) {
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

export type AllowKind = "all" | "channel" | "video" | "playlist";

export async function allow(kind: AllowKind, id: string, name: string, expiry: number | null) {
  let allowed = await getAllowed(kind);

  // remove any existing allow records for this content
  allowed = allowed.filter((a) => (a.id != id));

  allowed.push({
    id: id,
    name: name,
    expiry: expiry,
    created: Date.now()
  });

  await storeAllowed(kind, allowed);
}

export async function removeAllow(kind: AllowKind, id: string) {
  let allowed = await getAllowed(kind);
  allowed = allowed.filter((a) => (a.id != id));
  await storeAllowed(kind, allowed);
  return allowed;
}

export type AllowRecord = {
  id: string,
  name: string,
  expiry: number | null,
  created: number
};


export async function getAllowed(kind: AllowKind) {
  const listKey = kind + "_list";
  const allowedList = <AllowRecord[]>((await chrome.storage.local.get(listKey))[listKey] || []);
  return allowedList;
}

export async function storeAllowed(kind: AllowKind, allowed: AllowRecord[]) {
  const listKey = kind + "_list";
  await chrome.storage.local.set({ [listKey]: allowed });
}

export async function isAllowed(kind: AllowKind, id: string) {

  const allowed = await getAllowed(kind);

  const allowedRecord = allowed.find((r) => r.id == id);

  if (!allowedRecord) return { ok: false, expiry: null };

  if (!allowedRecord.expiry) return { ok: true, expiry: null };

  if (allowedRecord.expiry < Date.now()) return { ok: false, expiry: null };

  return { ok: true, expiry: allowedRecord.expiry };
}

export async function canWatch(videoId: string | null, channelId: string | null, playlistId: string | null) {
  //console.log(`checking ${videoId}  --   ${channelId}`);

  const all = await isAllowed("all", "all");
  if (all.ok) return all;

  if (channelId) {
    const chn = await isAllowed("channel", channelId);
    if (chn.ok) return chn;
  }

  if (videoId) {
    const vid = await isAllowed("video", videoId);
    if (vid.ok) return vid;
  }

  if (playlistId) {
    const vid = await isAllowed("playlist", playlistId);
    if (vid.ok) return vid;
  }

  return { ok: false, expiry: null };
}
