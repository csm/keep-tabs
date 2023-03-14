function tabKey(windowId, tabId) {
    return `w=${windowId}&t=${tabId}`;
}

async function onAlarm() {
    let configs = await chrome.storage.local.get(['unusedInterval', 'allowedGroups']);
    let allowedGroups = configs.allowedGroups || [];
    let timeout = configs.unusedInterval * 60 * 1000;
    let minTimestamp = Date.now() - timeout;
    //console.log(`minTimestamp is ${minTimestamp}`);
    let tabs = await chrome.tabs.query({highlighted: false, pinned: false});
    //console.log('read all tabs:');
    //tabs.forEach(t => console.log(` - ${t}`));
    tabs = tabs.filter(tab => {
        //console.log(`tab ${tab.id} groupId ${tab.groupId} allowedGroups: ${allowedGroups}`);
        return tab.groupId == chrome.tabGroups.TAB_GROUP_ID_NONE || allowedGroups.includes(tab.groupId);
    });
    //console.log('read candidate tabs:');
    //tabs.forEach(t => console.log(` - ${JSON.stringify(t)}`));
    if (tabs.length > 0) {
        let tabKeys = tabs.map(tab => tabKey(tab.windowId, tab.id));
        //console.log(`reading tab keys: ${tabKeys}`);
        let tabInfos = await chrome.storage.local.get(tabKeys);
        //console.log('read tabinfos for candidates:');
        for (let k in tabInfos) {
            let i = tabInfos[k];
            //console.log(` - ${k} -> ${JSON.stringify(i)}`);
        }
        let closeIds = tabs.filter(tab => {
            let tabInfo = tabInfos[tabKey(tab.windowId, tab.id)];
            return tabInfo != null && tabInfo.lastHighlight < minTimestamp;
        }).map(tab => tab.id);
        //console.log(`closing tabs: ${closeIds}`);
        await chrome.tabs.remove(closeIds);
    }
}

async function tabsHighlighted(windowId, tabIds) {
    let keys = tabIds.map(tabId => tabKey(windowId, tabId));
    let results = await chrome.storage.local.get(keys);
    for (var i = 0; i < keys.length; i++) {
        let result = results[keys[i]];
        if (result == null) {
            result = {lastHighlight: Date.now()}
            results[keys[i]] = result;
        } else {
            result.lastHighlight = Date.now()
        }
    }
    await chrome.storage.local.set(results);
}

async function tabCreated(tab) {
    let key = tabKey(tab.windowId, tab.id);
    await chrome.storage.local.set({
        [key]: {
            lastHighlight: Date.now(),
        }
    });
}

async function tabClosed(tab) {
    let key = tabKey(tab.windowId, tab.id);
    await chrome.storage.local.remove(key);
}

async function initialize() {
    let alarm = await chrome.alarms.create("keepTabsAlarm", {periodInMinutes: 1});
    chrome.alarms.onAlarm.addListener(async alarm => {
        if (alarm.name == "keepTabsAlarm") {
            await onAlarm();
        }
    });
    chrome.tabs.onHighlighted.addListener((tabInfo) => {
        tabsHighlighted(tabInfo.windowId, tabInfo.tabIds);
    });
    chrome.tabs.onCreated.addListener(tabCreated);
    chrome.tabs.onRemoved.addListener(tabClosed);
    let tabs = await chrome.tabs.query({});
    let initTabs = {};
    tabs.forEach(tab => {
        let key = tabKey(tab.windowId, tab.id);
        initTabs[key] = {
            lastHighlight: Date.now()
        };
    });
    await chrome.storage.local.set(initTabs);
}

chrome.runtime.onInstalled.addListener(async () => {
    await chrome.storage.local.set({unusedInterval: 60, allowedGroups: []});
    await initialize();
});

chrome.runtime.onStartup.addListener(async () => {
    await initialize();
});
