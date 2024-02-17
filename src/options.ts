import { DataTable } from "simple-datatables";
//import Fuse from "fuse.js"
import { clearPassword, getAllowed } from "./common";
window.onload = init;


/* 
function renderTable(tableEl: Element, kind: AllowKind) {
  const filter = "";

  let allowedList = allowed[kind];

  if (filter) {
    const fuseOptions = {
      // isCaseSensitive: false,
      // includeScore: false,
      // shouldSort: true,
      // includeMatches: false,
      // findAllMatches: false,
      // minMatchCharLength: 1,
      // location: 0,
      // threshold: 0.6,
      // distance: 100,
      // useExtendedSearch: false,
      // ignoreLocation: false,
      // ignoreFieldNorm: false,
      // fieldNormWeight: 1,
      keys: [
        "name",
        "id"
      ]
    };


    const fuse = new Fuse(allowed, fuseOptions);
    allowedList = fuse.search(filter);
  }


  let tableHTML = "";

  tableHTML += `<table id='allow-table-${kind}' class='allow-table'>`;
  tableHTML += `<th>name</th><th>id</th><th>expiry</th><th>action</th>`;

  tableHTML += `</table>`;

  tableEl.innerHTML = tableHTML;

}
*/

function deleteRecord(e: Event) {
  console.log(e);
  const el = <Element>e.target;

  const index = el?.closest("tr")?.getAttribute("data-index") || 0;

  console.log(index);


}

async function init() {

  const allowed = {
    all: await getAllowed("all"),
    video: await getAllowed("video"),
    channel: await getAllowed("channel"),
  }


  const allowedList = allowed["video"];

  let allowRecordData = {
    "headings": [
      "Name",
      "ID",
      "Expiry",
      "Action"
    ],
    //"data": Array.from(allowedVids).map(([_, a]) => [(a.name || "[UNKNOWN]"), a.id, (a.expiry) ? String(a.expiry) : "", `<button>delete</button>`])
    "data": allowedList.map(a => [(a.name || "[UNKNOWN]"), a.id, (a.expiry) ? String(a.expiry) : "", `<button onclick='deleteRecord()'>delete</button>`])

  };

  console.log(deleteRecord);

  const allowRecordTable = new DataTable("#allow-record-table", {
    columns: [
      {
        select: 0,
        type: "date",
        format: "DD/MM/YYYY"
      },
    ],
    data: allowRecordData
  });

  console.log(allowRecordTable);

  document.querySelector("button#reset-master-password")?.addEventListener("click", () => {
    if (confirm("Are you sure that you want to clearhe master password?")) {
      clearPassword();
    }
  });


  //const tableEl = document.querySelector("#allow-record-table-x")
  //if (tableEl) renderTable(tableEl);




}
