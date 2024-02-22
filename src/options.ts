import Fuse from "fuse.js"
import { clearPassword, getAllowed, removeAllow, type AllowKind, type AllowRecord } from "./common";
window.onload = init;

function initTable(tableAreaEl: Element, kind: AllowKind) {

  tableAreaEl.innerHTML = `<input type='search' class='table-search'></input><div class='table-outer'></div>`;

  const filterEl = <HTMLInputElement>tableAreaEl.querySelector("input[type=search].table-search");
  const tableEl = <Element>tableAreaEl.querySelector(".table-outer");

  type Sortkey = "name" | "id" | "expiry" | "created";

  let sortKey: Sortkey = "name";
  let sortDir = 1;
  let filterText = "";
  let filteredRecords: AllowRecord[] = [];
  let pageNumber = 1;
  const pageSize = 4;
  let pagedRecords: AllowRecord[] = [];
  const fuseOptions = {
    minMatchCharLength: 1,
    keys: [
      "name",
      "id"
    ]
  };
  let filter = new Fuse(allowed[kind], fuseOptions);

  function compareFn(a: AllowRecord, b: AllowRecord) {
    // the only reason a_ or b_ should be falsey is if they 
    // are a null expiry time. Null expiry time means expire 
    // never, which is after any actual time, hence we treat
    // it as a large number 
    const a_ = a[sortKey] || Number.MAX_VALUE;
    const b_ = b[sortKey] || Number.MAX_VALUE;
    return sortDir * (a_ < b_ ? -1 : (a_ > b_ ? 1 : 0));
  }

  function sortRecords() {
    allowed[kind].sort(compareFn);
  }

  function filterRecords() {
    filteredRecords = (filterText) ? filter.search(filterText).map((r) => r.item) : allowed[kind];
  }

  function setFilterText(value: string) {
    filterText = value;
  }

  function pageRecords() {
    const start = (pageNumber - 1) * pageSize;
    const end = start + pageSize;
    pagedRecords = filteredRecords.slice(start, end)
  }

  function recreateFilter() {
    filter = new Fuse(allowed[kind], fuseOptions);
  }

  function linkFor(kind: AllowKind, id: string) {
    if (kind === "video") return `https://youtube.com/watch/?v=${id}`;
    if (kind === "channel") return `https://youtube.com/${id}`;
    return "https://youtube.com";
  }

  function renderTable() {
    let tableHTML = "";
    tableHTML += `<table id='allow-table-${kind}' class='allow-table'>`;
    tableHTML += `<th class='sortable'>name</th><th class='sortable'>expiry</th><th class='sortable'>created</th><th>action</th>`;

    pagedRecords.forEach((r) => {
      let rowHTML = ""
      rowHTML += `<tr>`;
      rowHTML += `<td><a target="_blank" href='${linkFor(kind, r.id)}'>${r.name}</a></td>`;
      if (r.expiry == null) {
        rowHTML += `<td class='null-data'>Never</td>`;
      } else {
        rowHTML += `<td>${new Date(r.expiry).toString().split(" GMT")[0]}</td>`;
      }
      rowHTML += `<td>${new Date(r.created).toString().split(" GMT")[0]}</td>`;
      rowHTML += `<td><button record-id='${r.id}' class='delete-record dangerous'>delete</button></td>`;
      rowHTML += `</tr>`;
      tableHTML += rowHTML;
    });

    tableHTML += `</table>`;
    tableEl.innerHTML = tableHTML;

    tableEl.querySelectorAll("button.delete-record").forEach((btn: Element) => {
      let id = btn.getAttribute("record-id") || "NONE";
      btn.addEventListener("click", async () => {
        allowed[kind] = await removeAllow(kind, id);
        sortRecords();
        recreateFilter();
        filterRecords();
        pageRecords();
        renderTable();
      });
    });
  }

  setFilterText("");
  sortRecords();
  recreateFilter();
  filterRecords();
  pageRecords();
  renderTable();

  filterEl.addEventListener("input", () => {
    filterText = filterEl.value;
    pageNumber = 1;
    filterRecords();
    pageRecords();
    renderTable();
  });
}

function initTables(containerEl: Element) {
  containerEl.innerHTML = `
<div class='tabbed-area'>
  <div class='tabs'>
    <div class='tab active' tab-id='video'>Allowed Videos</div>
    <div class='tab' tab-id='channel'>Allowed Channels</div>
    <div class='tab' tab-id='all'>Allowed All</div>
    <div class='tab' tab-id='playlist'>Allowed Playlists</div>
  </div>
  <div>
    <div tab-id='video' class='tabbed-page active'></div>
    <div tab-id='channel' class='tabbed-page'></div>
    <div tab-id='all' class='tabbed-page'></div>
    <div tab-id='playlist' class='tabbed-page'></div>
  </div>
</div>`;

  containerEl.querySelectorAll(".tab").forEach((tab) => {
    let id = <AllowKind>tab.getAttribute("tab-id");
    tab.addEventListener("click", () => {
      containerEl.querySelectorAll("[tab-id]").forEach((el) => {
        el.classList.toggle("active", (el.getAttribute("tab-id") == id));
      });
    });
  })

  containerEl.querySelectorAll(".tabbed-page").forEach((el) => {
    const kind = <AllowKind>el.getAttribute("tab-id");
    initTable(el, kind);
  });

}

type AllowedRecordRecord = {
  all: AllowRecord[],
  video: AllowRecord[],
  channel: AllowRecord[],
  playlist: AllowRecord[]
};

let allowed: AllowedRecordRecord = {
  all: [],
  video: [],
  channel: [],
  playlist: []
}

async function init() {

  allowed = {
    all: await getAllowed("all"),
    video: await getAllowed("video"),
    channel: await getAllowed("channel"),
    playlist: await getAllowed("playlist")
  };

  const tableEl = document.querySelector("#allow-records");
  if (tableEl) initTables(tableEl);

  document.querySelectorAll("#reset-master-password").forEach((el) => (<Element>el).addEventListener("click", clearPassword));

}
