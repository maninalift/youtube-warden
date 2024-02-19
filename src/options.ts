//import { DataTable } from "simple-datatables";
import Fuse from "fuse.js"
import { clearPassword, /* getAllowed, */ type AllowKind, AllowRecord } from "./common";
window.onload = init;



function initTable(tableEl: Element, kind: AllowKind) {

  let allowRecords: AllowRecord[] = [
    { id: "abc01", name: "Norman Boob", expiry: 123, created: 34234 },
    { id: "abc02", name: "Michael Boob", expiry: 234, created: 341341 },
    { id: "abc03", name: "Norman Xoob", expiry: 12123, created: 84215 },
    { id: "abc04", name: "Norm Gorm", expiry: null, created: 3223 },
    { id: "bbc01", name: "Rorman Boob", expiry: 1273, created: 24234 },
    { id: "rabc02", name: "Miechael Boob", expiry: 234, created: 111341 },
    { id: "rabc03", name: "Forman Xoob", expiry: 12325, created: 154215 },
    { id: "rabc04", name: "Naaarm Gorm", expiry: null, created: 30123 },
    { id: "rabc01", name: "Normanee Boob", expiry: 5123, created: 24234 },
    { id: "robc02", name: "Mochael Boob", expiry: 2534, created: 342241 },
    { id: "_rabc03", name: "Ruorman Xoob", expiry: 1253123, created: 151215 },
    { id: "_rabc04", name: "Nooorm Gorm", expiry: null, created: 21023 },
    { id: "_rabc01", name: "Normmman Boob", expiry: 1253, created: 34204 },
    { id: "_rabc02", name: "Michaeel Buub", expiry: 2346, created: 351341 },
    { id: "xrabc03", name: "Worman Ioob", expiry: 166123, created: 304215 },
    { id: "xrabc04", name: "Sorm Sorm", expiry: null, created: 30023 },
  ];
  //let allowed = getAllowed(kind);
  //allowed[kind];

  type Sortkey = "name" | "id" | "expiry" | "created";

  let sortKey: Sortkey = "name";
  let sortDir = 1;
  let filterText = "";
  let filteredRecords = allowRecords;
  let pageNumber = 1;
  const pageSize = 4;
  let pagedRecords = allowRecords;
  const fuseOptions = {
    minMatchCharLength: 1,
    keys: [
      "name",
      "id"
    ]
  };
  let filter = new Fuse(allowRecords, fuseOptions);

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
    allowRecords = allowRecords.sort(compareFn);
  }

  function filterRecords() {
    filteredRecords = (filterText) ? filter.search(filterText).map((r) => r.item) : allowRecords;
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
    filter = new Fuse(allowRecords, fuseOptions);
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
      rowHTML += `<td><button class='dangerous'>delete</button></td>`;
      rowHTML += `</tr>`;
      tableHTML += rowHTML;
      console.log(r);
      console.log(rowHTML);
    });

    tableHTML += `</table>`;
    tableEl.innerHTML = tableHTML;
  }

  setFilterText("a");
  sortRecords();
  recreateFilter();
  filterRecords();
  pageRecords();
  renderTable();

  console.log(pagedRecords);


  //

}

async function init() {

  /*const allowed = {
    all: await getAllowed("all"),
    video: await getAllowed("video"),
    channel: await getAllowed("channel"),
  }*/
  const tableEl = document.querySelector("#allow-record-table-x");
  if (tableEl) initTable(tableEl, "video");

  document.querySelectorAll("#reset-master-password").forEach((el) => (<Element>el).addEventListener("click", clearPassword));


}
