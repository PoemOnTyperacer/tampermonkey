// ==UserScript==
// @name         D.TR-P
// @namespace    http://tampermonkey.net/
// @version      1.1
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/d_tr-p.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/d_tr-p.js
// @description  Data.TypeRacer-Points
// @author       poem
// @match        https://data.typeracer.com/pit/result*
// @grant        GM_getValue
// @grant        GM_setValue
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==

// var c,f,s,n,start_time,done,j=0,0,0,0,'',false,0;
// var race_log = document.getElementsByTagName('script')[7].innerText.split(',')[3].split('\|')[0];
// alert(race_log);
// while(j<race_log.length&&!done)
// {
//     if(start_time==''){
//         if(race_log[j].isInteger())
//             dqslf;
//         else
//             n++;
//         j++;
//     }
// }

var race_universe = "play"
if($('.raceDetails > tbody > tr:nth-child(4) > td:nth-child(1)')[0].innerText=="Universe")
	race_universe = $('.raceDetails > tbody > tr:nth-child(4) > td:nth-child(2)')[0].innerText;
var player_name = /.*\((.*)\)$/.exec($('.raceDetails > tbody > tr:nth-child(1) > td:nth-child(2)')[0].innerText)[1];
var race_number = $('.raceDetails > tbody > tr:nth-child(2) > td:nth-child(2)')[0].innerText;
var date_str = $('.raceDetails > tbody > tr:nth-child(3) > td:nth-child(2)')[0].innerText;
var date_obj = new Date(date_str);
var race_unix_num = parseInt((date_obj.getTime()/1000).toFixed(0));
var unix_start = (race_unix_num-1).toString();
var unix_end = (race_unix_num+1).toString();
var race_data_url = 'https://data.typeracer.com/games?playerId=tr:'+player_name+'&universe='+race_universe+'&startDate='+unix_start+'&endDate='+unix_end;
fetch(race_data_url)
	.then(response => {
		if (response.status !== 200)
			return;
		response.json().then(data => {
			for(var i=0;i<data.length;i++)
			{
				if(data[i].gn==race_number)
				{
					$('.raceDetails > tbody').append($('<tr><td>Points</td><td>'+data[i].pts.toString()+'</td></tr>'));
					$('.raceDetails > tbody > tr:nth-child(4) > td > span')[0].innerHTML = data[i].wpm.toString()+" WPM";
				}
				else
					alert(atob("d29haCEgd2hvZXZlciBjb21wbGV0ZWQgdGhpcyByYWNlIGFsc28gY29tcGxldGVkIGFub3RoZXIgcmFjZSBSRUFMTFkgbm90IGxvbmcgYmVmb3JlIG9yIGFmdGVyIHRoaXMgb25lISBCcm8hIFdhcyB0aGF0IHlvdSBicm8/ISBUaGF0J3MgcHJldHR5IGNvb2wgaWYgeW91IGFzayBtZSwgYnJvLiBHTkFSTFkhIE9rIGJybywgSSB0aGluayBJJ2xsIHNlZSBteXNlbGYgb3V0IG5vdyEgKGFsc28gZHcgYnJvLCB5b3UncmUgbm90IGJlaW5nIGhhY2tlZCEgSWYgeW91IHJlYWxseSBkb24ndCBrbm93IHdoZXJlIHRoaXMgY2FtZSBmcm9tLCB5b3Ugc2hvdWxkIGFzayB5b3VyIGJlc3QgZnJpZW5kIChJIHdvdWxkIGV2ZW4gZGFyZSB0byBzYXkuLi4geW91ciBicm8pIHBvZW0hIEkgc3dlYXIgaSBkaWRuJ3QganVzdCBpbXBsZW1lbnQgdGhpcyB0byB0cm9sbCB5b3UgYnJvLCB0aGVyZSB3YXMgYSBnb29kIHJlYXNvbiA6KCB5b3UgZ290dGEgYmVsaWV2ZSBtZSBicm9vbyA6KCAod29vcHNpZSBJIGZvcmdvdCB0byBjbG9zZSBvbmUgc2V0IG9mIHBhcmVudGhlc2VzKSAoLi5icm8pKQ=="));
			}
		});
	})
	.catch(err => {
		alert("[D.TR-P] error");
	});

// window.addEventListener('load', function() {
//     // your code here
// }, false);
