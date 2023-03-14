let config = await chrome.storage.local.get(['unusedInterval', 'allowedGroups']);
//console.log(`read config: ${config}`);

let minutesInput = document.getElementById("unused_interval");
minutesInput.onchange = async _ => {
    let newValue = Number.parseInt(minutesInput.value);
    //console.log(`new interval value: ${newValue} (${minutesInput.value})`);
    if (newValue > 0) {
        await chrome.storage.local.set({"unusedInterval": minutesInput.value});
    }
};
let unusedInterval = config.unusedInterval || 10;
minutesInput.value = `${unusedInterval}`;

function colorToColor(color) {
    if (color == "grey") {
        return "#4d5054";
    } else if (color == "blue") {
        return "#1859e2";
    } else if (color == "red") {
        return "#cd1b1d";
    } else if (color == "yellow") {
        return "#f59a08";
    } else if (color == "green") {
        return "#186f2a";
    } else if (color == "pink") {
        return "#c20072";
    } else if (color == "purple") {
        return "#8e1cf0";
    } else if (color == "cyan") {
        return "#0e686f";
    } else if (color == "orange") {
        return "#f67c30";
    }
    return "#fff";
}

async function changeGroupSelection(groupId, selected) {
    let allowedGroups = config.allowedGroups;
    if (selected) {
        if (!allowedGroups.includes(groupId)) {
            allowedGroups.push(groupId);
        }
    } else {
        allowedGroups = allowedGroups.filter(g => g != groupId);
    }
    config.allowedGroups = allowedGroups;
    await chrome.storage.local.set({allowedGroups});
}

let checkboxList = document.getElementById("selected_groups");
let allowedGroups = config.allowedGroups || [];
let tabGroups = await chrome.tabGroups.query({});
if (tabGroups.length > 0) {
    let label = document.createElement('p');
    label.innerText = 'Also close any tabs in the selected tab groups:';
    checkboxList.appendChild(label);
}
tabGroups.forEach(group => {
    let input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `group_${group.id}_allowed`;
    input.checked = allowedGroups.includes(group.id);
    input.onchange = async ev => {
        await changeGroupSelection(group.id, input.checked);
    };
    let colorTag = document.createElement('span');
    colorTag.classList.add('colorTag');
    colorTag.style = `background-color: ${colorToColor(group.color)}`;
    let label = document.createElement('label');
    label.for = `group_${group.id}_allowed`;
    label.innerText = group.title;
    checkboxList.appendChild(input);
    checkboxList.appendChild(colorTag);
    checkboxList.appendChild(label);
    checkboxList.appendChild(document.createElement('br'));
});
