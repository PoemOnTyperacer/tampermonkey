// ==UserScript==
// @name         TR Chart
// @namespace    http://tampermonkey.net/
// @version      2025-04-26
// @description  Text History Chart
// @author       artemis_05
// @match        https://play.typeracer.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=typeracer.com
// @grant        none
// ==/UserScript==

const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

(function () {
    'use strict';
    const waitForRaceEnd = new MutationObserver(() => {
        const status = document.querySelector('.gameStatusLabel')?.innerText || '';
        if (status.includes('You finished')) {
            setTimeout(renderChart, 1000);
        }
    });
    waitForRaceEnd.observe(document.body, { childList: true, subtree: true });

    function renderChart() {
        const raceData = getRaceData();
        if (!raceData.length) return console.warn("No race data found.");

        const container = document.querySelector(".gwt-TabPanelBottom > div:not([style*='display: none'])");
        const chartImg = container?.querySelector("td[width='330px'] > img.gwt-Image");

        if (!container || !chartImg) return console.warn("Chart container not found.");

        const canvas = document.createElement("canvas");
        canvas.id = "customWpmChart";
        canvas.width = 500;
        canvas.height = 400;
        chartImg.replaceWith(canvas);

        loadChartJs(() => {
            drawChart(raceData, canvas);
            createFloatingChart(raceData);
        });
    }

    function loadChartJs(callback) {
        if (window.Chart) return callback();

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = callback;
        script.onerror = () => console.error("Failed to load Chart.js.");
        document.head.appendChild(script);
    }

    function drawChart(dataPoints, canvas) {
        const ctx = canvas.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "rgba(255,182,193,0.5)");
        gradient.addColorStop(1, "rgba(255,182,193,0.1)");

        const labels = dataPoints.map(p => p.when);
        const wpmData = dataPoints.map(p => p.wpm);
        const maxWpm = Math.max(...wpmData);
        const maxIndex = wpmData.indexOf(maxWpm);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'WPM',
                    data: wpmData,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: '#FF69B4',
                    borderWidth: 3,
                    tension: 0.35,
                    pointRadius: ctx => ctx.dataIndex === maxIndex ? 7 : 4,
                    pointBackgroundColor: ctx => ctx.dataIndex === maxIndex ? '#FFD700' : '#FF69B4'
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                animation: { duration: 1000, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#333',
                        titleColor: '#FF69B4',
                        bodyColor: '#fff',
                        callbacks: {
                            label: ctx => ctx.dataIndex === maxIndex ? `✨ Peak: ${ctx.parsed.y} WPM` : `${ctx.parsed.y} WPM`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#ccc' },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: '#ccc' },
                        grid: { color: 'rgba(255,182,193,0.2)' },
                        suggestedMax: Math.max(...wpmData) + 10
                    }
                }
            },
            plugins: [
                {
                    id: 'shadow',
                    beforeDraw: chart => {
                        const {ctx} = chart;
                        ctx.save();
                        ctx.shadowColor = 'rgba(255,182,193,0.4)';
                        ctx.shadowBlur = 15;
                        ctx.shadowOffsetY = 5;
                    },
                    afterDraw: chart => chart.ctx.restore()
                },
                {
                    id: 'drawSparkle',
                    afterDatasetsDraw(chart) {
                        const {ctx, scales: {x, y}} = chart;
                        ctx.save();
                        ctx.font = "20px Arial";
                        ctx.textAlign = "center";
                        ctx.fillText("✨", x.getPixelForValue(maxIndex), y.getPixelForValue(maxWpm) - 20);
                        ctx.restore();
                    }
                }
            ]
        });
    }

    function createFloatingChart(data) {
        document.getElementById("customWpmWrapper")?.remove();

        const wrapper = document.createElement("div");
        wrapper.id = "customWpmWrapper";
        wrapper.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        width: 500px;
        height: 320px;
        backdrop-filter: blur(10px);
        background: rgba(20, 20, 20, 0.7);
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        padding: 14px;
        z-index: 9999;
        cursor: move;
        user-select: none;
        color: #ccc;
        font-family: 'roboto', sans-serif;
    `;

        const title = document.createElement("div");
        title.innerText = '"I type, therefore I am."';
        title.style.cssText = `
        font-family: 'Playfair Display', serif;
        font-size: 18px;
        font-weight: 500;
        font-style: italic;
        text-align: center;
        letter-spacing: 0.75px;
        color: #f0f0f0;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    `;

        const canvas = document.createElement("canvas");
        canvas.width = 476;
        canvas.height = 276; 

        wrapper.appendChild(title);
        wrapper.appendChild(canvas);
        document.body.appendChild(wrapper);

        if (window.Chart) drawChart(data, canvas);
        else loadChartJs(() => drawChart(data, canvas));

        makeDraggable(wrapper);
    }

    function makeDraggable(element) {
        let isDragging = false;
        let offsetX, offsetY;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            element.style.transition = "none";
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                element.style.left = `${e.clientX - offsetX}px`;
                element.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.transition = "all 0.2s ease";
            }
        });
    }


    function getRaceData() {
        const table = [...document.querySelectorAll("table.StatsTable")].find(tbl => {
            return [...tbl.querySelectorAll("tr")].some(row => row.innerText.includes("moments ago"));
        });
        if (!table) return [];

        return [...table.querySelectorAll("tr:not(.headerRow)")].map(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 5) return null;

            const wpm = parseFloat(cells[1].querySelector("div")?.title || "");
            if (isNaN(wpm)) return null;

            return {
                raceNumber: cells[0].innerText.trim(),
                wpm,
                accuracy: cells[2].innerText.trim(),
                points: cells[3].innerText.trim(),
                when: cells[4].innerText.trim()
            };
        }).filter(Boolean).reverse();
    }

})();
