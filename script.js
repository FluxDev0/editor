let textNumber = -1;

function nextText() {
    textNumber++;
    document.querySelectorAll("body > .text").forEach((element) => {
        element.style = "display: none;";
        if (element.dataset.n == textNumber) {
            element.style = "display: block;";
        }
    });
}

nextText();

function lastText() {
    textNumber--;
    document.querySelectorAll("body > .text").forEach((element) => {
        element.style = "display: none;";
        if (element.dataset.n == textNumber) {
            element.style = "display: block;";
        }
    });
}

document.querySelectorAll("textarea.code").forEach((element) => {
    document.querySelector(`iframe[data-p="${element.dataset.p}"]`).srcdoc = element.value;
    element.addEventListener('keyup', () => {
        document.querySelector(`iframe[data-p="${element.dataset.p}"]`).srcdoc = element.value;
    });
});