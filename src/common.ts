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

export async function clearPassword() {
  await chrome.storage.local.remove("password");
}

export function getParameterByName(name: string, url = window.location.href) {
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

export type AllowKind = "all" | "channel" | "video";

export async function allow(kind: AllowKind, id: string, name: string, expiry: number | null) {
  let allowed = await getAllowed(kind);

  allowed.set(id, {
    id: id,
    name: name,
    expiry: expiry
  });

  await storeAllowed(kind, allowed);
}

type AllowRecord = {
  id: string,
  name: string,
  expiry: number | null
};

// type AllowRecordWriter = { AllowType: AllowRecord };

export async function setPassword(password: string) {
  const salt = crypto.randomUUID();

  const passwordRecord = {
    salt: salt,
    hash: (await hashPassword(password, salt)),
  };

  await chrome.storage.local.set({ password: passwordRecord });
}

export async function hasPassword() {
  const passwordRecord = (await chrome.storage.local.get("password")).password;
  return !!(passwordRecord);
}

export async function checkPassword(password: string) {
  const passwordRecord = (await chrome.storage.local.get("password")).password;
  if (!passwordRecord) return false;
  const thisHash = await hashPassword(password, passwordRecord.salt);
  return (thisHash === passwordRecord.hash);
}

export async function getAllowed(kind: AllowKind) {
  const listKey = kind + "_list";
  const allowedList = <[[string, AllowRecord]]>(await chrome.storage.local.get(listKey))[listKey] || [];
  const allowedMap = new Map(allowedList);
  return allowedMap;
}

async function storeAllowed(kind: AllowKind, allowed: Map<string, AllowRecord>) {
  const listKey = kind + "_list";
  const allowedList = Array.from(allowed);
  await chrome.storage.local.set({ [listKey]: allowedList });
}

export async function isAllowed(kind: AllowKind, id: string) {

  const allowed = await getAllowed(kind);

  const allowedRecord = allowed.get(id);

  if (!allowedRecord) return false;

  if (!allowedRecord.expiry) return { expiry: null };

  if (allowedRecord.expiry < Date.now()) return false;

  return { expiry: allowedRecord.expiry };
}

export async function canWatch(videoId: string, channelId: string) {
  console.log(`checking ${videoId}  --   ${channelId}`)
  return (await isAllowed("all", "all"))
    || (await isAllowed("channel", channelId))
    || (await isAllowed("video", videoId));
}
