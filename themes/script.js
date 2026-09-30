const input = document.querySelector("#theme-name");
const body = document.querySelector("body")

function setTheme() {
    body.dataset.theme = input.value;
}