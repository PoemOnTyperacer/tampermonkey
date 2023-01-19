// ==UserScript==
// @name         Typeracer: Blacklist
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/blacklist.user.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/blacklist.user.js
// @description  Hide guests and users of your choice on maintrack. Doesn't affect leaderboards, competitions, messages, or Race details pages
// @author       poem#3305
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @noframes
// ==/UserScript==

const BLACK_LIST=[]; //ex 'poem'
const BLOCK_GUESTS=true;
const DEBUG = false;

const RED_OUTLINE_MODE=false;
const GUI_INTERVAL = 2000;
const ELEMENT_CONFIG = {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: false, };
const RANK_CONFIG = {
    characterData: false,
    attributes: false,
    childList: true,
    subtree: true };



let competitors = [];
let total_competitors=0;
let racing=false;
let standings=1;
let blocked_standings=0;
let queue=[];

function log(msg, highlight=false){
    if(!DEBUG)
        return;
    if(highlight) {
        console.log(("%c[TR Block] "+msg),"color:red;");
        return
    }
    console.log('[Blacklist] '+msg)
}

// Observe new player rows
function elementMutate(mutations_list) {
    for(let j=0;j<mutations_list.length;j++) {
        let mutation=mutations_list[j];
        for(let i=0;i<mutation.addedNodes.length;i++) {
            let added_node=mutation.addedNodes[i];
            if(added_node.className=='row') {
                if(!racing) {
                    log('In race');
                    log('competitors list length='+competitors.length+'; resetting');
                    disconnectRankObservers();
                    competitors=[];
                    total_competitors=0;
                    racing=true;
                    standings=1;
                    queue=[];
                }
                competitors.push([added_node,null,null]);
                added_node.style.filter='opacity(0%)';
                setTimeout(function() {onNewPlayerRow(total_competitors++);},1000); //wait for line to load
            }
        }
    }
}
const elementObserver = new MutationObserver(elementMutate);
elementObserver.observe(document.body, ELEMENT_CONFIG);

function disconnectRankObservers() {
    for(let i=0;i<competitors.length;i++) {
        if(competitors[i][2]!=null)
            competitors[i][2].disconnect();
    }
}

// Observe rank div
function rankMutate(mutations_list, id) {
    mutations_list.forEach(function(mutation) {
        let textContent=mutation.addedNodes[0].textContent;
        if(/^\d+$/.test(textContent[0])) {
            let rank=parseInt(/^\d+/.exec(textContent[0])[0]);
            let username=competitors[id][1];
            log('player #'+id+', username='+username+', finished with rank '+rank);
            competitors[id][2].disconnect();
            if(username=='you') {
                log('You finished');
                racing=false;
            }
            editLabel(id,rank);
        }
    });
}

function editLabel(id,rank) {
    let row = competitors[id][0];
    let username = competitors[id][1];
    let labelRank=row.querySelector('.rank');

    if(blocked_standings+standings!=rank) { //if editLabel receives winners in the wrong order
        queue.push([id,rank]);
        log('queuing user #'+id+', username='+username+', rank='+rank+' received too early (standings='+standings+', blocked_standings='+blocked_standings+')');
        return;
    }

    if((username=='guest_user'&&BLOCK_GUESTS)||BLACK_LIST.includes(username)) {
        labelRank.innerText='X';
        blocked_standings++;
    }
    else {
        let output=ordinal_suffix_of(standings)+ ' Place';
        if (standings==1)
            output+='!';
        else
            output+='.';
        labelRank.innerText=output;

        standings++;
    }

    for(let i=0;i<queue.length;i++) { //function calls itself again for any queued winner whose standing is now resolved
        if(standings+blocked_standings==queue[i][1]) {
            let params=queue.splice(i,1)[0];
            log('standing resolved for player #'+params[0]+', username='+competitors[params[0]][1]+', rank='+params[1]+' (standings='+standings+', blocked_standings='+blocked_standings+')');
            editLabel(params[0],params[1]);
            return;
        }
    }
}

function ordinal_suffix_of(i) { //thanks Salman A on stackoverflow
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

function onNewPlayerRow(id) {
    let row = competitors[id][0];
    let labelUsername=row.querySelector('.lblUsername');
    let username=labelUsername.innerText;
    if(username[0]=='(')
        username=username.slice(1,-1);
    if(username=='you'||username=='(you)') {
        username='you';
        log('player #'+id+' is self');
    }
    else if(username=='') {
        username='guest_user';
        log('player #'+id+' is a guest');
        if(BLOCK_GUESTS) {
            log('hiding guest user', true);
            if(RED_OUTLINE_MODE)
                row.style.border='4px solid red';
            else
                row.style.display='none';
        }
    }
    else {
        log('player #'+id+' is '+username);
        if(BLACK_LIST.includes(username)) {
            log('hiding blacklisted user', true);
            if(RED_OUTLINE_MODE)
                row.style.border='4px solid red';
            else
                row.style.display='none';
        }
    }

    row.style.filter='opacity(100%)';
    let rankObserver = new MutationObserver(function(mutations_list) {rankMutate(mutations_list,id);});
    rankObserver.observe(row.querySelector('.rank'), RANK_CONFIG)
    competitors[id][1]=username;
    competitors[id][2]=rankObserver;
}


// Analyze competitors
function GUIClock() {
    let gameStatusLabels = document.getElementsByClassName('gameStatusLabel');
    let gameStatus = ((gameStatusLabels || [])[0] || {}).innerHTML || '';
    if(racing&&((gameStatusLabels.length==0) || ( gameStatus == 'The race has ended.' || gameStatus.startsWith('You finished')))){
        racing = false;
        log('Race finished (GUI detection)');
    }
}
setInterval(GUIClock, GUI_INTERVAL);
