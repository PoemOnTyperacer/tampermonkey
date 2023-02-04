// ==UserScript==
// @name         Typeracer: Blacklist
// @namespace    http://tampermonkey.net/
// @version      0.0.7
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/blacklist.user.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/blacklist.user.js
// @description  Hide guests/bots and users of your choice on maintrack/private tracks. Doesn't affect leaderboards, competitions, messages, or Race details pages
// @author       poem#3305
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @noframes
// ==/UserScript==

//settings
const BLACK_LIST=[]; //eg: const BLACK_LIST=['poem','despot'];
const BLOCK_GUESTS=true;
const DEBUG = false;


//no longer settings
const RED_OUTLINE_MODE=false;
const GUI_INTERVAL = 1000;
const ELEMENT_CONFIG = {childList: true, subtree: true, attributes: true, characterData: false};
const RANK_CONFIG = {characterData: false, attributes: false, childList: true, subtree: true};
let competitors = [];
let total_competitors=0;
let racing=false;
let standings=1;
let blocked_standings=0;
let queue=[];
let won=false;
function log(msg, highlight=false){
    if(!DEBUG)
        return;
    if(highlight) {
        console.log(("%c[TR Block] "+msg),"color:red;");
        return
    }
    console.log('[Blacklist] '+msg)
}

//observe new player rows
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
                    standings=1;
                    racing=true;
                    blocked_standings=0;
                    queue=[];
                    won=false;
                }
                competitors.push([added_node,null,null]);
                let potential_username=added_node.querySelector('.lblUsername').innerText;
                //hide any new row till the council decides its fate
                if(RED_OUTLINE_MODE)
                    added_node.style.filter='opacity(0%)';
                else if(potential_username!='you'&&potential_username!='(you)') {
                    added_node.style.position='absolute';
                    added_node.style.zIndex='-1';
                    added_node.style.top="-1000px";
                }
                //wait a second for the contents of the row to load before i process it
                setTimeout(function() {onNewPlayerRow(total_competitors++);},1000);
            }
        }
    }
}
const elementObserver = new MutationObserver(elementMutate);
elementObserver.observe(document.body, ELEMENT_CONFIG);

//decide if i wanna make the new row visible and if so bring it back from the shadow realm
function onNewPlayerRow(id) {
    let row = competitors[id][0];
    let labelUsername=row.querySelector('.lblUsername');
    let statusLabels=document.getElementsByClassName('gameStatusLabel');
    if(statusLabels.length==0) {
        log('the race was cancelled since newplayerrow was called -- dropping new row');
        return;
    }
    let statusLabel=statusLabels[0].innerText;
    let username=labelUsername.innerText;
    let blocked=false;
    if(username[0]=='(')
        username=username.slice(1,-1);
    if(username=='you'||username=='(you)'||(username==''&&statusLabel=="Join this race, whenever you're ready...")) {
        username='you';
        log('player #'+id+' is self');
    }
    else if(username=='') {
        username='guest_user';
        log('player #'+id+' is a guest');
        if(BLOCK_GUESTS) {
            log('hiding guest user', true);
            blocked=true;
            if(RED_OUTLINE_MODE) {
                row.style.border='4px solid red';
            }
            else
                row.style.display='none';
        }
    }
    else {
        log('player #'+id+' is '+username);
        if(BLACK_LIST.includes(username)) {
            log('hiding blacklisted user', true);
            blocked=true;
            if(RED_OUTLINE_MODE) {
                row.style.border='4px solid red';
            }
            else
                row.style.display='none';
        }
    }
    if(RED_OUTLINE_MODE)
        row.style.filter='opacity(100%)';
    if(!blocked) {
        row.style.position='relative';
        row.style.zIndex='0';
        row.style.top="";
    }
    //also for each new row, start looking at the div where their rank will appear (1st 2nd etc)
    let rankObserver = new MutationObserver(function(mutations_list) {rankMutate(mutations_list,id);});
    rankObserver.observe(row.querySelector('.rank'), RANK_CONFIG)
    competitors[id][1]=username;
    competitors[id][2]=rankObserver;
}

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

//if any players aren't done racing when u leave the race, stop observing their rank
function disconnectRankObservers() {
    for(let i=0;i<competitors.length;i++) {
        if(competitors[i][2]!=null)
            competitors[i][2].disconnect();
    }
}

//rewrite the ranks to exclude anyone on the blacklist
function editLabel(id,rank) {
    let row = competitors[id][0];
    let username = competitors[id][1];
    let labelRank=row.querySelector('.rank');

    if(blocked_standings+standings!=rank) { //if editLabel receive a player's rank in the wrong order, store them for later
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
        if(username=='you'&&standings==1) {
            won=true;
        }
        standings++;
    }

    for(let i=0;i<queue.length;i++) { //editLabel calls itself again for any queued player whose standing is now resolved
        if(standings+blocked_standings==queue[i][1]) {
            let params=queue.splice(i,1)[0];
            log('standing resolved for player #'+params[0]+', username='+competitors[params[0]][1]+', rank='+params[1]+' (standings='+standings+', blocked_standings='+blocked_standings+')');
            editLabel(params[0],params[1]);
            return;
        }
    }
}

//thanks Salman A on stackoverflow
function ordinal_suffix_of(i) {
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

function GUIClock() {
    //in case user quits before finishing the race
    let gameStatusLabels = document.getElementsByClassName('gameStatusLabel');
    let gameStatus = ((gameStatusLabels || [])[0] || {}).innerHTML || '';
    if(racing&&((gameStatusLabels.length==0))){
        racing = false;
        log('Race cancelled');
    }
    //edit the gamestatuslabel so it doesn't snitch on the user's real rank, that would break the illusion,
    if(gameStatusLabels.length!=0) {
        let label=gameStatusLabels[0];
        let new_label;
        if(label.style.display!='none') {
            new_label=label.cloneNode(true);
            new_label.id='newlabel';
            new_label.class='newlabel';
            label.style.display='none';
            label.parentNode.insertBefore(new_label, label.nextSibling);
        }
        else {
            new_label=document.getElementById('newlabel');
        }
        if(gameStatus.startsWith('You finished')&&gameStatus!='You finished 1st!') {
            if(won) {
                log('Edited game status');
                new_label.innerText='You finished 1st!';
            }
            else
                new_label.innerText='The race has ended.';
        }
        else
            new_label.innerText=gameStatus;
    }
}
setInterval(GUIClock, GUI_INTERVAL);
