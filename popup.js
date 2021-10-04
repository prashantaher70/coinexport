function exportNavs(type) {
    return function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "COIN_NAV_EXPORT", ext: type}, null);
        });
    }
}

document.getElementById("export-json").addEventListener("click", exportNavs('json'))
document.getElementById("export-csv").addEventListener("click", exportNavs('csv'))
