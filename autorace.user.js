// ==UserScript==
// @name         Auto Race
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Auto saves, auto joins
// @author       pentalon, poem, & keegant
// @match        https://*.typeracer.com/*
// @exclude      https://data.typeracer.com/pit/result?id=*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        window.close
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==

var autoSaveToggle;

function autoSave()
{
    var chkAutoSave = document.getElementById('chkAutoSave');
    autoSaveToggle = GM_getValue('autoSaveToggle', false);

    if (!addedCheckbox)
    {
        if (!chkAutoSave)
        {
            $('#tstats > table').append($('<tr><td><input type="checkbox" id="chkAutoSave" style="vertical-align: middle"><span style="color:#ffffff"> Auto Race</span></input></td></tr>'));
        }
        else
        {
            addedCheckbox = true;
            chkAutoSave.checked = autoSaveToggle;
            chkAutoSave.addEventListener('change', function(event)
            {
                if (event.isTrusted)
                {
                    GM_setValue('autoSaveToggle', this.checked);
                }
            });
        }
    }
    else
    {
        chkAutoSave.checked = autoSaveToggle;
    }

    if (!autoSaveToggle)
    {
        return;
    }
    var gameStatus = (document.getElementsByClassName('gameStatusLabel')[0] || {}).innerHTML || '';
    if (gameStatus.startsWith('You finished') || gameStatus.startsWith('The race has ended'))
    {
        if (!saved)
        {
            var gwtAnchors = document.getElementsByClassName('gwt-Anchor');
            var saveLink = gwtAnchors[8] || {};
            if (saveLink.innerHTML == 'Save')
            {
                var imageButtons = Array.from(document.getElementsByClassName('ImageButton'));
                imageButtons.find(elem => elem.title == 'Fast forward to the end').click();
                let statsNumbers=document.getElementsByClassName('tblOwnStatsNumber');
                if(statsNumbers.length==0)
                    return;
                let firstStatsNumber = statsNumbers[0].innerHTML.split(' wpm');
                if(firstStatsNumber.length==1)
                    return;
                let registeredSpeed=firstStatsNumber[0]
                var logSpeed = +((document.getElementsByClassName('statusIndicator')[1] || {}).title || '').split(' WPM')[0];
                console.log('registered='+registeredSpeed+' ; unlagged='+logSpeed+' ; reverse lag = '+(registeredSpeed > logSpeed+1));
                if (registeredSpeed > logSpeed+1)
                {
                    alert('Reverse lag detected! Score not saved.\nAuto-rejoin canceled for this race.');
                    saved = true;
                    joined = true;
                }
                else
                {
                    saveLink.click();
                    saved = true;
                    joined = false;
                }
                imageButtons.find(elem => elem.title == 'Reset').click();
            }
            else if ((gwtAnchors[5] || {}).innerHTML == 'Try again?')
            {
                // main track
                saved = true;
                joined = false;
            }
            else if ((document.getElementsByClassName('raceAgainLink')[0] || {}).innerHTML == 'join race »')
            {
                 // private track
                saved = true;
                joined = false;
            }
        }
    }
    else
    {
        saved = false;
    }

    if((document.documentElement.textContent || document.documentElement.innerText).indexOf('Saves remaining: 0') > -1)
    {
        if (staging)
        {
            if(window.location.href.indexOf("play.typeracer.com") != -1)
            {
                window.location.replace(document.URL.replace("play.typeracer.com", "staging.typeracer.com"));
            }
            if(window.location.href.indexOf("staging.typeracer.com") != -1)
            {
                window.close();
            }
        }
        staging = false;
    }

    if (!joined)
    {
        var raceAgainLink = document.getElementsByClassName('raceAgainLink')[0];
        if (raceAgainLink && isVisible(raceAgainLink))
        {
            raceAgainLink.click();
            joined = true;
        }
    }
}

function isVisible(elem)
{
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

function toggleAutoSave(key)
{
    if (key.keyCode == 13)
    {
        GM_setValue('autoSaveToggle', !autoSaveToggle);
    }
}

document.onkeypress = toggleAutoSave;

var addedCheckbox = false;
var saved = false;
var joined = true;
var staging = true;
setInterval(autoSave, 1);
