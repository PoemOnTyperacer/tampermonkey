// ==UserScript==
// @name         Typeracer: Precision countdown
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Fix race starting with 0.5s to go & add tenths of second to race countdowns
// @author       poem#3305 & keegan#1689
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @noframes
// ==/UserScript==


//VERSION: drift correction + rolling median error prediction

const STEP=500;
const DECIMAL_PLACES=0;
const COUNTDOWNPOPUP_CLASS = 'countdownPopup horizontalCountdownPopup';
const INPUT_CLASS='txtInput txtInput-unfocused';
const ELEMENT_CONFIG = { subtree: false, childList: true };
const COUNTDOWN_CONFIG = { characterData: false, attributes: false, childList: true, subtree: true };
const COUNTDOWN_REGEX = /:0(.)/;
const DEBUG=true;
const DRIFT_HISTORY_SAMPLES=10

let countdown;
let countdown_popup_element;
let precision_countdown_1;
let precision_countdown_2;
let timerRunning=false;
let countdownValue;
let count;
let counter;
let expected;
let expected_final;
let failed=false;
let drift_history = [];
let drift_correction = 0;
let timer_values=[0,"000"];

const elementObserver = new MutationObserver(elementMutate);
elementObserver.observe(document.body, ELEMENT_CONFIG);


function log(msg, color='#7DF9FF') {
    if(DEBUG)
        console.log('%c [Countdown Alert] '+msg, 'color: #7DF9FF');
}

function elementMutate(mutations_list) {
	mutations_list.forEach(function(mutation) {
		mutation.addedNodes.forEach(function(added_node) {
			if(added_node.className == COUNTDOWNPOPUP_CLASS) {
				observeCountdown(added_node);
			}
		});
	});
}

function newPrecisionCountdown(original_countdown) {
    precision_countdown_1=document.createElement('span');
    precision_countdown_2=document.createElement('span');
    precision_countdown_1.id='precision_countdown_1';
    precision_countdown_2.id='precision_countdown_2';
    let parent = original_countdown.parentNode;
    parent.appendChild(precision_countdown_1);
    parent.appendChild(precision_countdown_2);
}

function observeCountdown(countdown_popup) {
    countdown_popup_element = countdown_popup;
    let time_elements=countdown_popup.getElementsByClassName('time');
    if(time_elements.length==0)
        return;
    countdown=time_elements[0];
    countdown.style.visibility='hidden';
    countdown.style.position='absolute';
    newPrecisionCountdown(countdown);
    const countdownObserver = new MutationObserver(countdownMutate);
    failed=false;
    countdownObserver.observe(countdown, COUNTDOWN_CONFIG)
}


function countdownMutate(mutations_list) {
    mutations_list.forEach(function(mutation) {
        let date=Date.now();
        let textContent=mutation.addedNodes[0].textContent;
        let match = COUNTDOWN_REGEX.exec(textContent);
        if (match==null)
            return;
        countdownValue = match[1];
        if(!timerRunning&&!failed&&countdownValue=='4') {
            timerRunning=true;
            log('Starting countdown');
            return;
        }
        if(count==null&&timerRunning&&!failed) {
            startTimer(countdownValue, date);
        }
    });
}

function startTimer(value, referenceDate=null) {
    count=parseInt(value)*1000+500;
    let date = Date.now();
    if(referenceDate==null) {
        counter=setTimeout(timer, STEP);
        expected = date + STEP;
        expected_final= date + count;
    }
    else {
        counter=setTimeout(timer, STEP-Date.now()+referenceDate);
        expected=referenceDate+STEP;
        expected_final=referenceDate+count;
    }
}

function stopTimer() {
    clearTimeout(counter);
}


function calc_drift(arr){
    var values = arr.concat();
    values.sort(function(a,b){
        return a-b;
    });
    if(values.length ===0) return 0;
    var half = Math.floor(values.length / 2);
    if (values.length % 2) return values[half];
    var median = (values[half - 1] + values[half]) / 2.0;
    return median;
}

function refreshTimer(count) {
    let seconds=count/1000;
    let milliseconds;
    if(DECIMAL_PLACES>0) {
        seconds=Math.floor(seconds);
        milliseconds=count-1000*seconds;
    }
    else
        seconds=Math.ceil(seconds);
    if(seconds!=timer_values[0]) {
        precision_countdown_1.innerText=seconds.toString();
        timer_values[0]=seconds;
    }
    if(DECIMAL_PLACES>0) {
        let formatted_ms = ('000' + milliseconds).substr(-3).slice(0,DECIMAL_PLACES);
        if(parseInt(formatted_ms)!=timer_values[1]) {
            precision_countdown_2.innerText='.'+('000' + milliseconds).substr(-3).slice(0,DECIMAL_PLACES);
            timer_values[1]=parseInt(formatted_ms);
        }
    }
}

function timer() {
    var dt = Date.now() - expected;
    if (dt > STEP) {
        console.warn('Precision countdown error: the drift exceeded the interval. Restoring default countdown');
        precision_countdown_1.remove();
        precision_countdown_2.remove();
        countdown.style.visibility='visible';
        countdown.style.position='relative';
        failed=true;
        drift_history = [];
        drift_correction = 0;
        timerRunning=false;
        count=null;
        return;
    }
    count=count-STEP;
    if(count<=0) {
        refreshTimer(0,0);
        count=null;
        timerRunning=false;
        if(DEBUG) {
            let final_date=Date.now();
            let error=final_date-expected_final;
            countdown_popup_element.style.visibility='hidden';
            log('Countdown finish report\nlateness: '+error+'ms (dt='+dt+')\n(finished at date: '+final_date+'\nexpected end date was: '+expected_final+')\npredictive correction applied: '+drift_correction+'ms\ndrift history: '+drift_history);
        }
        return;
    }
    if (dt<=STEP&&!failed) {
        drift_history.push(dt + drift_correction);
        drift_correction = calc_drift(drift_history);
        if (drift_history.length >= DRIFT_HISTORY_SAMPLES) {
            drift_history.shift();
        }
    }
    expected += STEP;
    counter=setTimeout(timer, Math.max(0, STEP - dt - drift_correction));
    refreshTimer(count);
}
