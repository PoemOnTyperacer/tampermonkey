// ==UserScript==
// @name         Flagging Page Enhancer
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Adds a 'disqualified status' column, and translates IPs into locations
// @author       mako640, poem
// @include      https://data.typeracer.com/pit/admin/flagging*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      data.typeracer.com
// @connect      api.ipstack.com
// ==/UserScript==

                        /*GENERAL SETUP*/
'use strict';
const debugging = true;
const dark_mode = false;

function log(msg) {
    if(debugging)
        console.log(msg);
}
// used for the API depletion warning
var displayErrorLine = document.createElement('h2');
displayErrorLine.style.color='red';
for (const h of document.querySelectorAll('h2')) {
    if (h.textContent.includes('Results')) {
        let container = document.getElementsByClassName('section section--boxed')[1]
        container.insertBefore(displayErrorLine,h);
        console.log('inserted error line');
        break;
    }
}

                        /*IP TRANSLATING -- from number to location*/
const IPSTACK_KEYS = ['340914b1f7d8f09ac1c8afb3b85b1296','e69b7a06da6b832c8c5531a41d97c3f0','82be81745db918b21101420f916a63fd','6483b119604f359c7b74e656f150dcf0','08fcba4b7f470c012661700dd8353de7','95ae51c9e79df253c3578095d7056293','6bdf4fb726c60c056a886ed8533f1ba3','e1697ff185733680396c409b8271bea7'];

// The IPSTACK_KEYS array may be filled with any amount of Ipstack API keys, which will be used in linear order as they run out (1 free key subscription=10,000 requests/month).
// The keys I provided by default allow 96,000 requests per month across all users of this script (about 1200 times loading the flagging page, ie. 40 times loading the page per day, which should be plenty for 1 month)
// changing the array to IPSTACK_KEYS = ['off']; will simply disable the IP translation feature

// You may replace these keys by your own or add your own key(s):
// free subscription at https://ipstack.com/signup/free -- to obtain a key in a minute. Only address/email are required, and neither are verified.
// you can then monitor your API usage here https://ipstack.com/usage (12,000 lookups per month per key ("120% usage"), i.e. about 150 times loading the Flagging page)

var is_key_selected = false;
var selected_key=0;
// a selectKey process will be run before the script starts, to pick a working first key

var translation_status = []; //format: [[ip,success (default T/F),color_id,city,country,started,finished,country_flag_emoji],...]
var latest_translation = 0; //used to assign a translation_id to a new translation

//list of 80 maximally distinct colors
const colors = ["#FFFF00", "#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059",
        "#FFDBE5", "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
        "#5A0007", "#809693", "#FEFFE6", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
        "#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
        "#DDEFFF", "#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
        "#372101", "#FFB500", "#C2FFED", "#A079BF", "#CC0744", "#C0B9B2", "#C2FF99", "#001E09",
        "#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68", "#7A87A1", "#788D66",
        "#885578", "#FAD09F", "#FF8A9A", "#D157A0", "#BEC459", "#456648", "#0086ED", "#886F4C",
        "#34362D", "#B4A8BD", "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81",
        "#575329", "#00FECF", "#B05B6F", "#8CD0FF", "#3B9700", "#04F757", "#C8A1A1", "#1E6E00"];
const color_number = colors.length;
var color_id = 0;

var firstPositiveResponse=0;
var totalResponses;
var totalRequests;

var cooldown = 0;
async function cooldownTick() {
    if(cooldown>0)
        cooldown--;
}
setInterval(cooldownTick,100);

var knownUsernames=[];
var toBeModified = [];

async function selectKey() { //looks for a valid key. If it doesn't find one, selects -1 and sets is_key_selected to True.
//     log('selectkey iteration: is_key_selected='+is_key_selected);
    let total_keys = IPSTACK_KEYS.length;
    if(IPSTACK_KEYS[0]=='off') {
        displayErrorLine.innerHTML = 'IP translating disabled (no API key provided).';
        selected_key=-1;
        is_key_selected=true;
        return;
    }
//     if(cooldown>0) {
//         console.log('selectKey request occurred during cooldown');
//         return;
//     }

//     selected_key is < total_keys
//     To avoid a very slow selection, launch one request on every remaining key in parallel, to find a working one as fast as possible
    totalRequests=selected_key-total_keys+2;
    firstPositiveResponse=-1;
    totalResponses=0;

    for(let x=selected_key; x<total_keys; x++) {
        let ip_api_url = 'http://api.ipstack.com/check?access_key='+IPSTACK_KEYS[x];
//     displayErrorLine.innerHTML='Connecting to IP translating API...';
        GM_xmlhttpRequest ( {
            method: 'GET',
            url: ip_api_url,
            onload: function (response) {
                try{
                    let data = JSON.parse(response.responseText);
                    if(data.success!=undefined) { // in case of failure of the API
                        if(data.error.code==104) {
                            console.log('Key #'+x+': API requests depleted for this month');
                        }
                        else
                            console.log('Key #'+x+' error #'+data.error.code+' ('+data.error.type+'): '+data.error.info);
                        totalResponses++;
                    }
                    else {
                        console.log('key #'+x+' answered positively');
                        if(firstPositiveResponse<0)
                            firstPositiveResponse=x;
                    }
                }
                catch(error){
                    console.log('error when selecting key: '+error);
                }
            }
        });
    }

//     wait for either one key to work, or all of them to fail
    while(firstPositiveResponse==-1&&totalResponses<total_keys)
    {
        await sleep(10);
    }
    if(firstPositiveResponse==-1) {//if all keys failked
        selected_key=-1;
        is_key_selected=true;
        displayErrorLine.innerHTML = 'IP translation disabled: all '+total_keys+' keys API requests depleted for this month';
    }
    else { //if at least one key worked (other requests might still be ongoing)
        selected_key=firstPositiveResponse;
        displayErrorLine.innerHTML='';
        is_key_selected = true;
//         cooldown=1;
        console.log('selected key #'+selected_key);
    }
}

async function modifyIpCell(translation_id,resultsTableRows,row,isVoter=false,hasFailedBefore=false){
//     Reading the IP to be translated
    let ip='';
    let column=findColumn(resultsTableRows,row,isVoter); // finding the correct column first
    if(isVoter){
        ip = resultsTableRows.item(row).children.item(column).innerText.split(' ')[0];
    }
    else
        ip = resultsTableRows.item(row).children.item(column).innerText.split(' ')[0];
    if(!hasFailedBefore) {
        translation_status.push([ip,true,null,null,null,false,false,null]);
//         console.log('coherence check: translation_id '+translation_id+', rank in the status array '+(translation_status.length-1));
    }
    if(ip=='') {// Some targets do not have an IP value
        return;
    }


    async function modifyCellOnResponse(data) {
        try {
                column = findColumn(resultsTableRows,row,isVoter);
                let ip_cell = resultsTableRows.item(row).children.item(column);
                let ip_lookup_link_element = ip_cell.children[0];
                let ip_lookup_sort_element = ip_cell.children[1];

//                 log('ip '+ip+' has received its data. is_key_selected='+is_key_selected);
                if(data.success!=undefined) { // in case of failure of the API

                    if(is_key_selected&&data.error.code==104) { // if no other parallel translation has started a selectKey process, then do it
                        log('starting a selectKey process (ip '+ip+', translation_id '+translation_id+')');
                        is_key_selected=false; // there is no longer a selected key globally
                        selectKey(translation_id);
                    }

//                     Then wait for the selectKey process to finish (note: multiple translations may be waiting at this point)
                    while(!is_key_selected)
                    {
                        await sleep(10);
                    }
                    // at this point the selectKey function has selected a working Key or determined that none of them work.
                    // it has then updated the is_key_selected status to True
                    if(selected_key==-1)
                        translation_status[translation_id][1]=false; //if selectKey couldn't find a working key, set the Success status to False.

                    // The function may call itself again if this was its first failure on this cell and there was indeed a working key.
                    if(!hasFailedBefore&&translation_status[translation_id][1]&&IPSTACK_KEYS[0]!='off') {
                        modifyIpCell(translation_id,resultsTableRows,row,isVoter,true);
                        return;
                    }
                    else { //however if there were no more working keys or if for some other reason the same cell failed twice, abort the translation for this cell to avoid looping
                        translation_status[translation_id][1]=false; //in case of repeated failure for a reason other than Key depletion
                        console.log('aborted ip '+ip+' translation');
                    }
                }
                else { //success of the API
//                     console.log('ip '+ip+' translation successful: '+data.city);
//                     ip_cell.style.width='150px';
                    if(data.city!=null) { // if the API knew the location
                        ip_lookup_link_element.innerText=data.city;
                        ip_lookup_link_element.title = data.city+', '+data.country_name+' (click to find users with this IP)';
                        ip_lookup_sort_element.innerText=data.location.country_flag_emoji.split('\\').join('&#x');
                        ip_lookup_sort_element.title = data.city+', '+data.country_name+' (click to filter flaggings by this IP)';
                        translation_status[translation_id][3]=data.city;
                        translation_status[translation_id][4]=data.country_name;
                        translation_status[translation_id][7]=data.location;
                    }
                }
//                 The coloring of the ip may occur whether the translation was successful or not:

                let known_ip_id = translation_status.findIndex(function(translation_data) { // determine if the exact same ip was given a color already
                    if(ip==translation_data[0]&&translation_data[2]!=null)
                        return true;
                    return false;
                });
                if(known_ip_id==-1) { // if this ip is new to the script
                    ip_lookup_link_element.style.color=colors[color_id];
                    translation_status[translation_id][2]=color_id;

//                     console.log('colored ip '+ip+' to '+colors[color_id]);
                    color_id++; //note: the script will not run out of colors to assign, as the 'colors' array contains 80 colors and a Flagging page contains no more than 40 lines with 2 IPs per line.
                }
                else{
                    ip_lookup_link_element.style.color=colors[translation_status[known_ip_id][2]];
                }
                translation_status[translation_id][6]=true; //signal to any identical IP waiting for this translation's results that it is now complete
            }
            catch(error) {
                console.log('[DQ column] ip '+ip+' translating error: '+error);
            }
    }

    let translated_ip_id = translation_status.findIndex(function(translation_data) { // determine if a translation was launched for the exact same ip already
                    if(ip==translation_data[0]&&translation_data[5])
                        return true;
                    return false;
                });
//     console.log('ip '+ip+' translated_ip_id: '+translated_ip_id);
    if(translated_ip_id==-1){//if the ip is new to the script, attempt a translation

            translation_status[translation_id][5]=true; //signal to any identical IP checking of a translation has been initiated that one is starting now
            while(!is_key_selected)
    {
        await sleep(10);
    }
    let ip_api_url = 'http://api.ipstack.com/'+ip+'?access_key='+IPSTACK_KEYS[selected_key];

//     Perform request assuming the selected Key is working.
    GM_xmlhttpRequest ( {
        method: 'GET',
        url: ip_api_url,
        onload: async function (response) {
            modifyCellOnResponse(JSON.parse(response.responseText));
        }
    });
    }
    else {//if the ip is known and a translation has been initiated, wait for its result
                    while(!translation_status[translated_ip_id][6])
    {
        await sleep(10);
    }
        let known_data = {'city':translation_status[translated_ip_id][3],
                          'country_name':translation_status[translated_ip_id][4],
                         'location':translation_status[translated_ip_id][7]};
//         console.log('recognized ip '+ip+' as having been translated already');
        modifyCellOnResponse(known_data);
    }
}

function findColumn(resultsTableRows,row,isVoter) {
    if(isVoter)
        return resultsTableRows.item(row).children.length-4;
    return 3;
}


                        /*DISQUALIFIED TRUE/FALSE COLUMN*/
var users_data = []; // Main function will communicate with those waiting for data from other websites using this array
const newColumnTitle = "disqualified";
const displayNameColTitle = "displayName";
const accountDataUrlBase = "https://data.typeracer.com/users?id=tr:";
const historyUrlBase = 'https://data.typeracer.com/pit/race_history?user=';
let displayNameColIndex = null;


function sleep(x) { // Wait for x ms
  return new Promise(resolve => setTimeout(resolve, x));
}

function getElementFromString(tag, string) {
    let element = document.createElement(tag);
    element.innerHTML = string;
    return element;
}

// given a user's display name, return the username
// example: "mako (mako640)" ==> "mako640"
// if it's a guest account, then return null
// note that on the flaggings page, display names always feature parenthesis around usernames, even with blank first and last names
function getUsernameFromDisplayName(displayName) {
    let usernameRegex = /.*\((.*)\)$/;
    let match = usernameRegex.exec(displayName);
    if (match != null) {
        return match[1];
    }
    return null;
}

// add the "Disqualified" table header
function insertDisqualifiedHeader(headerRow) {
    let afterColumn = headerRow.children[displayNameColIndex + 1];
    let newColumn = getElementFromString("th", newColumnTitle);
    headerRow.insertBefore(newColumn, afterColumn);
}

// insert a true/false disqualification value into a table row
function createDisqualifiedStatusCell(resultRow) {
    let afterColumn = resultRow.children[displayNameColIndex + 1];
    let newColumn = getElementFromString("td", 'Loading...');
    resultRow.insertBefore(newColumn, afterColumn);
}
function insertDisqualifiedStatus(resultRow, status) {
    let dqColumn = resultRow.children[displayNameColIndex + 1];
    dqColumn.innerHTML = status;
}

async function main() {
    // find the results table
    let resultsTableSelector = "table.cellTable:not(.queryTable)";
    let resultsTableList = document.querySelectorAll(resultsTableSelector);
    if (resultsTableList.length === 0) {
        return;
    }

    // find the "displayName" column
    let resultsTable = resultsTableList.item(0);
    let resultsTableRows = resultsTable.getElementsByTagName("tr");
    let resultsTableHeader = resultsTableRows.item(0);
    let resultsTableHeaderCols = resultsTableHeader.children;
    for (let i = 0; i < resultsTableHeaderCols.length; i++) {
        if (resultsTableHeaderCols.item(i).innerText === displayNameColTitle) {
            displayNameColIndex = i;
            insertDisqualifiedHeader(resultsTableHeader); //add "disqualified" label to the first row
        }
    }
    if (displayNameColIndex == null) {
        return;
    }

    // Get each username and call the function to modify their row
    for (let i = 1; i < resultsTableRows.length ; i++) {
        let resultRow = resultsTableRows.item(i);
        let displayName = resultRow.children.item(displayNameColIndex).innerText;
        let username = getUsernameFromDisplayName(displayName);
        modifyIpCell(latest_translation++,resultsTableRows,i);
        modifyIpCell(latest_translation++,resultsTableRows,i,true);
        createDisqualifiedStatusCell(resultRow);
        toBeModified.push([resultRow, username]);

    }
    await sleep(2500); //rates

    let userData;
    let i=0;
    while (userData = toBeModified[i]) {
        i++;
        let rrow = userData[0];
        let uname = userData[1];
        modifyResultRow(rrow, uname);
        let rateBreak=true;
        for (let i=0; i<knownUsernames.length; i++) {
            if(uname==knownUsernames[i][0]) {
                log('already collected information for user '+uname);
                insertDisqualifiedStatus(rrow, knownUsernames[i][1]);
            rateBreak=false;
            }
        }
        if(uname==null)
            rateBreak=false;
        if(rateBreak)
            await sleep(2500);
    }
}

// given a row of the table, fetch the user's disqualified status for each universe, format this data, and update the row with the formatted data
// is async
async function modifyResultRow(resultRow, username) {
    // if username is null, the user is a guest, and does not have a readable disqualified status
    if (username == null) {
        insertDisqualifiedStatus(resultRow, "N/A");
        return;
    }

    // the functions below will retrieve the user's active universes from their history page, then check the user's disqualified value for each of these universes using the data.typeracer api.
    // These various requests will be performed asynchronously so, while this function is waiting for all of them to be complete, the users_data array will contain an empty string
    // The 'while' loop below will check this value periodically until it's  replaced by the desired data once the requests are complete
    // I have no idea how to properly handle asynchronous functions. Leave me alone.
    users_data.push('');
    let key=users_data.length-1; // Reference of the variable used to communicate in users_data for this particular user (will be propagated to all functions below)

    getUserUniverseStatuses(username,key); //will eventually replace the users_data[key] variable with the desired data

    while(users_data[key]=='')
    {
        await sleep(10);
    }
    let statuses=users_data[key];

    if(statuses=='Error 429') {
        insertDisqualifiedStatus(resultRow, 'Rate limits reached.\nReloading...');
        toBeModified.push([resultRow, username])
        return;
    }

    // format the data
    let dqs = 0;
    let nondqs = 0;
    for(let k=0; k<statuses.length; k++)
    {
        let status=statuses[k];
        if(status)
            dqs++;
        else
            nondqs++;
    }
    let formatted_status = '';
    if(dqs>0)
    {
        if(nondqs>0)
            formatted_status = dqs+' true<br>'+nondqs+' false';
        else
            formatted_status='true';
    }
    else formatted_status='false';

    //insert the formatted data
    knownUsernames.push([username,formatted_status]);
    insertDisqualifiedStatus(resultRow, formatted_status);
}

// Grabs user history html (contains a list of the user's active universes)
function getUserUniverseStatuses(username, key)
{
    let user_history_url = historyUrlBase+username;
	GM_xmlhttpRequest ( {
		method: 'GET',
		url: user_history_url,
		onload: function (response) {
            return getUniverseStatusesFromHTML(username, response.responseText, key);
		}
	});
}

// Extract the universes list from the user's history page html, then for each of those check their disqualified status
function getUniverseStatusesFromHTML(username, html, key)
{
    if(html==undefined) {
        users_data[key]= 'Error 429';
        return;
    }
    let universes = [];
    let options = html.split('select name="universe"');
    if(options.length==1)
        universes = ["play"];
    else
    {
        options = options[1].split('\\select')[0].split('option value="');
        let i=1;
        let option;
        while(option=options[i])
        {
            i++;
            let universe=option.split('"')[0] || 'play';
            universes.push(universe);
        }
        if(html.includes('No results matching the given search criteria.'))
            universes.shift();
    }
    let universes_count = universes.length;
    let statuses = [];
    let i=0;
    let universe;
    while(universe=universes[i])
    {
        i++;
        let accountDataUrl = accountDataUrlBase + username + '&universe='+ universe;
        fetch(accountDataUrl)
        .then(response => {
            if (response.status !== 200) {
                console.log('error accessing universe',universe,'status data for user '+username);
                statuses.push('error');
                return;
            }
            response.json().then(data => {
                let isDisqualified = !!(data.tstats && data.tstats.disqualified);
                statuses.push(isDisqualified);

                if(statuses.length==universes_count) // if the disqualified data has been retrieved for each universe, replace the communication variable with the result
                {
                    users_data[key]=statuses;
                    return;
                }
            });
        })
        .catch(err => {
            console.log('error reading universe',universe,'status data for user '+username);
            statuses.push('error');
        });
    }
}

if(IPSTACK_KEYS[0]!='off') {
    selectKey();
}

function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

const flaggings_dark_style = `/* ubuntu-mono-regular - greek-ext_latin_greek_latin-ext_cyrillic_cyrillic-ext */
    @font-face {
        font-family: 'Ubuntu Mono';
        font-style: normal;
        font-weight: 400;
        src: url('../fonts/ubuntu-mono-v8-greek-ext_latin_greek_latin-ext_cyrillic_cyrillic-ext-regular.eot');
        /* IE9 Compat Modes */
        src: local('Ubuntu Mono'), local('UbuntuMono-Regular'),
        url('../fonts/ubuntu-mono-v8-greek-ext_latin_greek_latin-ext_cyrillic_cyrillic-ext-regular.eot?#iefix') format('embedded-opentype'), /* IE6-IE8 */
        url('../fonts/ubuntu-mono-v8-greek-ext_latin_greek_latin-ext_cyrillic_cyrillic-ext-regular.woff2') format('woff2'), /* Super Modern Browsers */
        url('../fonts/ubuntu-mono-v8-greek-ext_latin_greek_latin-ext_cyrillic_cyrillic-ext-regular.woff') format('woff'), /* Modern Browsers */
        url('../fonts/ubuntu-mono-v8-greek-ext_latin_greek_latin-ext_cyrillic_cyrillic-ext-regular.ttf') format('truetype'), /* Safari, Android, iOS */
        url('../fonts/ubuntu-mono-v8-greek-ext_latin_greek_latin-ext_cyrillic_cyrillic-ext-regular.svg#UbuntuMono') format('svg');
        /* Legacy iOS */
    }


    /*PERSONAL ADDITIONS*/


body > div.ie-fixMinHeight > div > div.container > div.main > div.themeContent.pit > div {
 background:#111 !important;
    width:100% !important;
}

    /*readable odd table row background*/
    tr.odd {
        background: #111;
    }

    /*dark background on over-large Flaggings Table*/
    body {
        background:#111111;
    }

    /*remove footer in admin console*/
    .footer {
        display:none;
    }

    /*Smooth car movement*/
    .scoreboard .row .progressBar {
        transition: linear 2s;
    }

    /*Remove IDM popup*/
    .InstaGibPopup {
        display:none;
    }

    /*Push user info box to the right*/
    .userInfo {
        margin-right:-110px;
    }

    /*Hide side widgets and center game ui*/
    .main .themeContent .view .newEastWidget,.main .themeContent .view .newWestWidget, .main .themeContent .view .newSouthWidget {
        display:none;
    }
   .main .themeContent .view>tbody>tr:nth-child(1)>td:nth-child(1) .newNorthWidget {
       display: none;
    }
    #dUI > table > tbody > tr:nth-child(2) > td:nth-child(3) {
        display:none;
    }

    /*Remove white patches and overlapping widgest from Race Details pages*/
    .main table.TypingLogReplayPlayer>tbody>tr:nth-child(1)>td, .main table.TypingLogReplayPlayer>tbody>tr:nth-child(2)>td, .main table.TypingLogReplayPlayer>tbody>tr:nth-child(3)>td, .main table.TypingLogReplayPlayer>tbody>tr:nth-child(4)>td, .main table.TypingLogReplayPlayer>tbody>tr:nth-child(5)>td, .main table.TypingLogReplayPlayer>tbody>tr:nth-child(6)>td, .main table.TypingLogReplayPlayer>tbody>tr:nth-child(7)>td, .main table.TypingLogReplayPlayer>tbody>tr:nth-child(9)>td,.main table.TypingLogReplayPlayer>tbody>tr:nth-child(4) table tbody tr {
        background:#333333;
    border: none;
    }
        .themeContent.pit .fullTextStr {
        background-color: #888;
    }
    .main table.TypingLogReplayPlayer>tbody>tr:nth-child(8)>td {
        background-color: #333333;
    }
    .container .main .eastWidget {
        z-index:-1;
    }
    .container .main .northWidget, .container .main .westWidget, .container .main .southWidget{
        z-index:-1;
    }


    /*OFFICIAL CODE*/
    .main, .container {
        background: #111;
    }

    body, html {
        color: #eee !important;
    }

    h1, h2, h3, h4, h5, li, a, .gameStatusLabel, .scoreboard, .row, .progressBar, .avatar, .lblName, .lblUsername, .rank {
        color: #eee;
    }
    .themeHeader#themeHeader {
        background: #222;
    }
    #tr_textHeader {
        color: #eee !important;
    }

    .mainMenu .enterRace {
        background-color: #333;
        background-image: url("https://github.com/Lachney/TypeRacer-Responsive-Dark-Theme/blob/master/assets/night.png?raw=true") !important;
        background-size: cover;
        border: #333 1px solid;
        border-radius: 8px;
    }


    .bkgnd-yellow, .bkgnd-blue, .bkgnd-purple, .bkgnd-green {
        transition: all 175ms;
    }
    .enterRace h2, h3 {
        color: #eee !important;
    }
    .mainMenu .practice {
        background-image: none;
        background-color: #222;
        color: #eee !important;
        border-color: #333;
    }
    .mainMenu .friends {
        background-image: none;
        background-color: #222;
        color: #eee !important;
        border-color: #333;
    }
    .statsView {
        background-image: none;
        background-color: #222;
        color: #eee !important;
        background-size: cover;
        border: #333 1px solid;
        border-radius: 8px;
    }
    .StatsTable table tr.headerRow td, .section--boxed {
        background-color: #333 !important;
        border: 1px solid #333;
    }

    table.themeHeader table.mainUserInfoBox > tbody > tr > td {
        border-color: #333;
    }

    table.themeHeader table.mainUserInfoBox > tbody > tr:first-child {
        background-color: #444;
        border-color: #333;
    }

    table.themeHeader table.mainUserInfoBox > tbody > tr.datarow {
        border-color: #333;
        background-color: #333
    }

    table.themeHeader table.mainUserInfoBox {
        border: none;
    }

    .OptionsWidget .OptionsWidgetBody li:nth-child(2) .gwt-Anchor.off {
        background: #111;
        border-color: #333;
    }

    #tstats > table > tbody > tr > td {
        color: #eee !important;
    }

    .mobileNav {
        background: #222;
        color: #eee;
    }
    .mobileNav a {
        color: #eee;
    }
    .mobileNav a:hover {
        color: #eee;
        background: #333;
    }
    .mobileMenu li + li {
        border-top: #555 1px solid
    }

    #tr_textHeader {
        margin: 0 auto;
        text-align: center !important;
        padding-bottom: 20px
    }

    table.themeHeader {
        background: #111;
        position: relative;
    }

    #school-edition-promo {
        background-image: none;
        background-color: #222;
        color: #eee !important;
        background-size: cover;
        border: #333 1px solid;
        border-radius: 8px;
        max-width: 1200px !important;
    }
    #school-edition-promo ul li {
        background-image: url("https://github.com/Lachney/TypeRacer-Responsive-Dark-Theme/blob/master/assets/arrow.png?raw=true");
        background-position: 0px 7px;
    }
    .StatsTable table tr td {
        background: #222 !important;
        color: #eee;
        border: 1px solid #333;
    }
    .horizontalCountdownPopup .lightLabel .countdownPopup {
        background-color: #222 !important;
    }
    table.inputPanel div {
        font-family: 'Ubuntu Mono', monospace;
        font-size: 1.15em;
    }
    .mainViewport table.inputPanel {
        border: none;
    }
    .mainViewport table.scoreboard > tbody > tr table tr td:nth-child(2) .rankPanelWpm {
        color: #eee !important;
    }
    .chrome_1, .chrome_m, .chrome_r, .mainViewport, table.inputPanel, .roomSection, .messagesPanel, .users-list, .AdvancedTextBox, .txtChatMsgInput, .AdvancedTextBox-unfocused {
        background-color: #111 !important;
        border-radius: 4px;
        padding: 10px;
    }

    .messagesPanel, .users-list, .AdvancedTextBox, .txtChatMsgInput, .AdvancedTextBox-unfocused {
        border: 1px solid #333 !important;
    }
    #dUI > table > tbody > tr > td:nth-child(1) > div > div.mainViewport > table > tbody > tr:nth-child(4) > td > div {
        border: none;
    }
    .txtInput {
        background-color: #222 !important;
        color: #eee !important;
    }
    table > tbody > tr:nth-child(4) > td > div > table > tbody > tr:nth-child(2) > td > table > tbody > tr > td:nth-child(1) {
        width: 200px !important;
    }
    table > tbody > tr:nth-child(4) > td > div > table > tbody > tr:nth-child(2) > td > table > tbody > tr > td:nth-child(1) > div img {
        width: 100%;
    }
    .popupContent, .DialogBox, .PlayerInfoPopup, .trPopupDialog, .gwt-MenuBar, .textInfoHeader, .mainViewport table.textInfoView > tbody > tr:nth-child(3) td {
        background-color: #222 !important;
        color: #eee !important;
        transition: all 75ms;
    }
    .textInfoHeader, .mainViewport table.textInfoView {
        border: 1px solid #333;
    }
    .gwt-MenuItem:hover {
        background-color: #444 !important;
        transition: all 75ms;
    }
    .DialogBox.trPopupDialog {
        -webkit-box-shadow: 1px 2px 7px #eee;
        box-shadow: 1px 2px 7px #eee;
    }
    .AdContainer, .AdContainer-728x90 {
        background-color: #222 !important;
        color: #eee !important;
        border: none !important;
    }

    .OptionsWidget, .eastWidget {
        background-color: #222 !important;
        color: #eee !important;
        border: none !important;
    }

    .gwt-InlineLabel {
        color: #eee !important;
    }

    .DialogBox.trPopupDialog .gwt-DisclosurePanel.gwt-DisclosurePanel-open, .gwt-DisclosurePanel, .gwt-DisclosurePanel-closed {
        background-color: #222 !important;
        color: #eee !important;
        border: 1px solid #333;
    }

    .sidebarBlocks-controls p {
        color: #eee;
    }

    .sidebarBlocks, .mainViewportHolder .sidebarBlocks iframe {
        background-color: #111;
        border-color: #333;
    }
    .sidebarBlock show, .sidebarBlock__content, .sidebarBlocks-prev, .sidebarBlocks-next {
        background: #222 !important;
        border-color: #333;
    }

    .sidebarBlock__subtext {
        background: #333 !important;
    }

    .statsView .tab-bar-select select {
        background: #222 !important;
        border-color: #333;
    }

    .mainViewport table.navControls tr td:nth-child(1) a.gwt-Anchor, .mainViewport table.navControls tr td:nth-child(2) .raceAgainLink, .statsView .highScoresView .highScoresFooter .lnkRefresh, .footer-cont .footer-wrapper .footer-east .change-theme-button {
        background-color: #FF5722;
    }

    .mainViewport table.navControls tr td:nth-child(2) .raceAgainLink:hover {
        background-color: #EBC100;
    }

    .headerSubmenu {
        background-color: #333;
    }

    #footer {
        background: #222;
    }

    /* Handle */
    /* width */
    ::-webkit-scrollbar {
        width: 10px;
    }

    /* Track */
    ::-webkit-scrollbar-track {
        background: #222;
    }

    /* Handle */
    ::-webkit-scrollbar-thumb {
        background: #888;
    }

    /* Handle on hover */
    ::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .mainViewport table.textInfoView > tbody > tr:nth-child(1) > td, .mainViewport table.textInfoView > tbody > tr:nth-child(2) > td, .mainViewport table.textInfoView > tbody > tr .tblOwnStats, .mainViewport table.textInfoView > tbody > tr .tblOwnStats, .mainViewport table.textInfoView > tbody > tr > td .textInfoAuthor, .mainViewport table.textInfoView > tbody > tr > td .textInfoContributor, .mainViewport table.textInfoView > tbody > tr > td .textInfoTitle {
        background-color: #222;
        border-color: #333;
    }

    .mainViewport table.textInfoView > tbody > tr .tblOwnStats .ScoreMenuButton > tbody > tr {
        background-color: #ff5722
    }

    .mainViewport div.TypingDisplaySection, .mainViewport table.TypingLogReplayPlayer > tbody > tr *, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(8) > td {
        background-color: #222;
        border-color: #333;
    }

    .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(1) > td, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(2) > td, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(3) > td, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(5) > td, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(6) > td, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(7) > td, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(9) > td, .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(4) table tbody tr, .UserGameResultsView .GameResultsChartView > tbody > tr:nth-child(1) > td > div > div > div > div:nth-child(1), .sidebarBlocks iframe {
        background-color: #222;
        border-color: #333;
    }

    .mainViewport .IncrementSpeedChart > div > div > div:nth-child(1) svg {
        filter: invert(1);
        border-radius: 8px;
    }

    .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(4) table tbody tr img, table > tbody > tr > td > div > table > tbody > tr > td > table > tbody > tr > td > table > tbody > tr > td > img {
        filter: invert(1);
    }

    .mainViewport table.TypingLogReplayPlayer > tbody > tr:nth-child(3) .lblStatusIndicator, .AnimationSpeedSelector {
        color: #eee;
    }

    .themeContent.login .loginform input[type="text"], .themeContent.login .loginform input[type="password"], .themeContent.pit form input[type="text"], .themeContent.login .loginform select, .themeContent.pit form select, .scorecardTable textarea, .messageTable, .messagesList li {
        background-color: #222;
        border-color: #333;
        color: #eee;
    }

    .scoresTable tr th, .friendsTable tr th {
        background-color: #555;
        border-color: #333;
        color: #eee;
    }
    .scoresTable tr td, .friendsTable tr td {
        background-color: #222;
        border-color: #333;
        color: #eee;
    }
    .scoresTable tr td:nth-child(1), .friendsTable tr td:nth-child(1) {
        background-color: #444;
        border-color: #333;
        color: #eee;
    }

    .bkgnd-blue {
        background-color: #ff5722 !important;
    }

    .headerSubmenu {
        filter: grayscale(1)
    }

    .ElapsedTimeLabel {
        color: #e0a87a !important;
    }

    /* Redesign Theme Fixes Only */
    /* Little more padding for leaderboard */
    .StatsTable table tr td:nth-child(1) {
        padding: 0.1em;
    }
    /*   Flag Fixes - Competitions   */
    .scoresTable tr td:nth-child(2) > div, .friendsTable tr td:nth-child(2) > div, .cellTable:not(.queryTable) tr td:nth-child(2) > div {
        display: inline-block;
        margin-left: 5px;
    }
    /*   Rounded Profile Pictures - Friends   */
    .userProfilePicLink img {
        border-radius: 64px;
    }
    /*  Wider Profiles    */
    body > div.ie-fixMinHeight > div > div.container > div.main > div.themeContent.pit > div {
        width: 130%;
    }`;
if(dark_mode)
    addGlobalStyle(flaggings_dark_style);
main();
