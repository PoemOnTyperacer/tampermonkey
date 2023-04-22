// ==UserScript==
// @name         Typeracer: Better Profiles
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Cleaner typeracer profiles, including organized awards by rank & type
// @author       keegant & poem
// @match        https://data.typeracer.com/pit/profile?user=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=typeracer.com
// @grant        GM_addStyle
// ==/UserScript==


//Toggle Per-Universe stats and description. Remove portable scorecard
let universesCards = document.getElementsByClassName("Section__Card");
for(let card of universesCards) {
    let oldHeader=card.querySelector('div h2');
    let headerDiv=oldHeader.parentNode;

    if(oldHeader.innerText=='Per-Universe Stats') {

        let scoresTable=card.querySelector('.Section__Card__Body')
        let isExpanded = true;
        let newHeader = document.createElement('table');
        newHeader.innerHTML = `<tbody><tr>
<td style="width:80%;"><h3>Per-Universe Stats</h3></td>
<td style="width:20%;"><a class="Section__Card__Body__Btn Section__Card__Body__Btn--pull-right" id='toggleLink'>eek</a><td>
</tr></tbody>`;
        newHeader.style.width="100%";
        let newTable;
        let section= scoresTable.parentNode;

        headerDiv.insertBefore(newHeader,oldHeader);
        oldHeader.remove();
        let toggleLink = document.getElementById('toggleLink');

        function toggleTable() {
            if(isExpanded) {
                let currentTable = card.querySelector('.Section__Card__Body');
                newTable = currentTable.cloneNode(true);
                currentTable.remove();
                section.style.paddingBottom="0px";

                toggleLink.innerHTML = 'Show';
                isExpanded=false;
            }
            else {
                section.appendChild(newTable);
                section.style.paddingBottom="32px";

                toggleLink.innerHTML = 'Hide';
                isExpanded=true;
            }
        }

        toggleTable();
        toggleLink.onclick = toggleTable;
    }
    else if(oldHeader.innerText=='About') {

        let newHeader = document.createElement('table');
        newHeader.innerHTML = `<tbody><tr>
<td style="width:80%;"><h3>About</h3></td>
<td style="width:20%;"><a class="Section__Card__Body__Btn Section__Card__Body__Btn--pull-right" id='toggleDescLink'>eek</a><td>
</tr></tbody>`;
        newHeader.style.width="100%";
        headerDiv.insertBefore(newHeader,oldHeader);
        oldHeader.remove();
        let toggleDescLink = document.getElementById('toggleDescLink');

        let descTable=card.querySelector('.Section__Card__Body');
        let section=descTable.parentNode;
        let description=descTable.innerText;
        let firstLineWords=description.split('\n')[0].split(' ');
        let isDescExpanded=true;

        let fullTable=descTable.cloneNode(true);
        let previewTable=descTable.cloneNode(true);
        let output='';
        for(let word of firstLineWords) {
            let nextOutput='';
            if(output=='')
                nextOutput=word;
            else
                nextOutput=output+' '+word;
            if(nextOutput.length<80) {
                output=nextOutput;
            }
            else
                break;
        }
        if(output==''){
            output=firstLineWords[0].slice(0,80);
        }
        if(output!=description)
            output+='...';
        else {
            isDescExpanded=null;
        }
        previewTable.innerText=output;


        function toggleDesc() {
            if(isDescExpanded) {
                let currentTable = card.querySelector('.Section__Card__Body');
                section.appendChild(previewTable);
                currentTable.remove();
                // section.style.paddingBottom="0px";

                toggleDescLink.innerHTML = 'Show';
                isDescExpanded=false;
            }
            else {
                let currentTable = card.querySelector('.Section__Card__Body');
                section.appendChild(fullTable);
                currentTable.remove();
                // section.style.paddingBottom="32px";

                toggleDescLink.innerHTML = 'Hide';
                isDescExpanded=true;
            }
        }
        if(isDescExpanded==null) {
            toggleDescLink.remove();
        }
        else {
            toggleDesc();
            toggleDescLink.onclick = toggleDesc;
        }
    }
    else if(oldHeader.innerText=='Your Portable Scorecard') {
        card.remove();
    }
}


let sectionHeader = document.getElementsByClassName("Section__Card__Header")[1];
if (sectionHeader.innerHTML.indexOf("Awards") == -1) return;

GM_addStyle(`
    .awards {
        display: flex;
        flex-direction: row;
        gap: 10px;
    }

    .medal-container {
        position: relative;
    }

    .medal-container:hover {
        cursor: pointer;
    }

    .badge {
        position: absolute;
        top: -2px;
        left: 12px;
        background-color: red;
        width: 23px;
        font-size: 10px;
        color: white;
        text-align: center;
        font-weight: bold;
        border-radius: 10px;
        padding: 1px;
        user-select: none;
    }

    .medals-expanded {
        position: absolute;
        top: -4px;
        background-color: rgb(0, 0, 0, 0.75);
        z-index: 1;
        border-radius: 5px;
        padding-top: 40px;
        white-space: nowrap;
        padding-right: 4px;
        transition: opacity 0.5s linear;
        cursor: default;
    }

    .medals-expanded h3 {
        color: #60affe;
        padding-left: 3px;
        margin-bottom: 10px;
        padding-top: 0px;
        border: none;
    }

    .medals-expanded div {
        padding-left: 1px;
        display: grid;
        grid-template-columns: repeat(18, 1fr);
        gap: 5px;
    }

    #medals-1st, #medals-2nd, #medals-3rd {
        position: relative;
        z-index: 2;
    }
`);


let medalTypes = ["Yearly", "Monthly", "Weekly", "Daily"];
let medalRanks = ["1st", "2nd", "3rd"];

let medalsContainer = document.getElementsByClassName("Section__Card__Body")[1];
let medalElements = medalsContainer.getElementsByTagName("a");

let medals = [
    [[], [], [], []],
    [[], [], [], []],
    [[], [], [], []],
];
let totalMedalCount = 0;
let newAwardsHTML = ``;

// Reading all medals
for (let i = 0; i < medalElements.length; i++) {
    let medal = medalElements[i];
    let title = medal.querySelector("img").title;

    for (let type = 0; type < 4; type++) {
        if (title.indexOf(medalTypes[type].toLowerCase()) != -1) {
            for (let rank = 0; rank < 3; rank++) {
                if (title.indexOf(medalRanks[rank] + " place") != -1) {
                    medals[rank][type].push(medal);
                    break;
                }
            }
            break;
        }
    }
}

// Creating new awards HTML
newAwardsHTML += `<div class="awards">`;

for (let rank = 0; rank < 3; rank++) {
    let rankCount = 0;
    for (let i = 0; i < 4; i++) {
        rankCount += medals[rank][i].length;
    }
    totalMedalCount += rankCount;

    // Creating base medal icons
    newAwardsHTML += `
        <div class="medal-container" style="${rankCount == 0 ? 'display: none;' : ''}">
            <div id="medals-${medalRanks[rank]}">
                <a>
                    <img src="https://data.typeracer.com/public/images/medals/32px/${rank + 1}.cache.png" draggable="false">
                    <div class="badge">${rankCount}</div>
                </a>
            </div>
            <div class="medals-expanded" id="expand-${medalRanks[rank]}" style="display: none;">
    `;

    // Creating expandables
    for (let type = 0; type < 4; type++) {
        let typeCount = medals[rank][type].length;
        if (typeCount == 0) continue;
        newAwardsHTML += `
            <h3>${medalTypes[type]} (${typeCount})</h3>
            <div>
        `;
        for (let i = 0; i < typeCount; i++) {
            newAwardsHTML += medals[rank][type][i].outerHTML;
        }
        newAwardsHTML += `</div>`;
    }
    newAwardsHTML += `</div></div>`;
}

newAwardsHTML += "<div>";

sectionHeader.innerHTML = `<h2>Awards (${totalMedalCount})</h2>`;
medalsContainer.innerHTML = newAwardsHTML;

// Toggles expandable with ID matching given rank
function toggleExpand(rank) {
    let expandElement = document.getElementById("expand-" + rank);
    if (expandElement.style.display == "none") {
        // Closing any other open expandables to prevent overlapping
        for (let i = 0; i < 3; i++) {
            if (medalRanks[i] != rank) {
                document.getElementById("expand-" + medalRanks[i]).style.display = "none";
            }
        }
        expandElement.style.display = "block";
    } else {
        expandElement.style.display = "none";
    }
}

// Event listeners to toggle expandables
for(let i = 0; i < 3; i++) {
    let rank = medalRanks[i];
    // stopPropagation prevents the element from closing on click
    document.getElementById("medals-" + rank).addEventListener("click", function(event) {
        event.stopPropagation();
        toggleExpand(rank);
    });
    document.getElementById("expand-" + rank).addEventListener("click", function(event) {
        event.stopPropagation();
    })
}

// Closing expandable if user clicks off
document.addEventListener("click", function() {
    document.getElementById("expand-1st").style.display = "none";
    document.getElementById("expand-2nd").style.display = "none";
    document.getElementById("expand-3rd").style.display = "none";
})
