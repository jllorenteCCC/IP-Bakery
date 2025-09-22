/*
8.8.8.8
8.8.4.4
1.1.1.1
1.0.0.1
23.216.10.72
23.53.180.128
52.14.64.0
52.32.0.0
104.16.132.229
151.101.1.69 34.192.0.2
34.208.32.100
35.160.0.8
35.172.0.5
44.195.0.12
44.224.0.22
50.16.0.7
52.0.0.5
54.144.0.33
54.200.0.44
*/

let extensionWindowId = null;

chrome.action.onClicked.addListener(() => {
  if (extensionWindowId !== null) {

    chrome.windows.get(extensionWindowId, (win) => {
      if (chrome.runtime.lastError || !win) {
        extensionWindowId = null;
        createExtensionWindow(); 
      } else {
        chrome.windows.update(extensionWindowId, { focused: true, state: "normal" });
      }
    });
  } else {
    createExtensionWindow();
  }
});

function createExtensionWindow() {
  chrome.system.display.getInfo((displays) => {
    const primary = displays.find(d => d.isPrimary) || displays[0];
    const screenWidth = primary.workArea.width;
    const screenHeight = primary.workArea.height;

    const w = Math.floor(screenWidth * 0.9);
    const h = Math.floor(screenHeight * 0.9);

    chrome.windows.create(
      {
        url: "popup.html",
        type: "normal",
        width: w,
        height: h,
        left: Math.floor((screenWidth - w) / 2),
        top: Math.floor((screenHeight - h) / 2)
      },
      (win) => {
        extensionWindowId = win.id;

        chrome.windows.onRemoved.addListener((closedWindowId) => {
          if (closedWindowId === extensionWindowId) {
            extensionWindowId = null;
          }
        });
      }
    );
  });
}
