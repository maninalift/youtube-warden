import { clearPassword } from "./common";
window.onload = init;

function init() {
  console.log("Yo!");

  document.querySelector("button#reset-master-password")?.addEventListener("click", () => {
    if (confirm("Are you sure that you want to clearhe master password?")) {
      clearPassword();
    }
  });
}
