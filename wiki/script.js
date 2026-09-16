function openWikiPage(pagename) {
    document.querySelector("body > .nav").style = "display: none;"
    document.querySelectorAll("body > .wikipage").forEach((element) => {
        element.style = "display: none;";
        if (element.dataset.name == pagename) {
            element.style = "display: block;";
        }
    });
}

function openNavigation() {
    document.querySelector("body > .nav").style = "display: block;"
    document.querySelectorAll("body > .wikipage").forEach((element) => {
        element.style = "display: none;";
    });
}

let html = "";

document.querySelectorAll("body > .wikipage").forEach((element) => {
    element.style = "display: none;";
    html += `<p class='link' onclick='openWikiPage("${element.dataset.name}")'>${element.dataset.name}</p>`;
});

document.querySelector("body > .nav").innerHTML = html;