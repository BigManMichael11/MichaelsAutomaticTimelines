import type { App, Editor, TFile } from "obsidian";
import type { ChartPluginSettings } from "src/constants/settingsConstants";
import type Renderer from "src/chartRenderer";
import type ChartPlugin from 'src/main';
import {DEFAULT_SETTINGS, ExamplePluginSettings}  from 'src/main';

import { getAPI } from "obsidian-dataview";

const dv = getAPI();

import myData from "../../calendarium/data.json";
 

//import { palettes, scales } from '@makio135/give-me-colors'


export function renderError(error: any, el: HTMLElement) {
    const errorEl = el.createDiv({ cls: "chart-error" });
    errorEl.createEl("b", { text: "Couldn't render Chart:" });
    errorEl.createEl("pre").createEl("code", { text: error.toString?.() ?? error });
    errorEl.createEl("hr");
    errorEl.createEl("span").innerHTML = "You might also want to look for further Errors in the Console: Press <kbd>CTRL</kbd> + <kbd>SHIFT</kbd> + <kbd>I</kbd> to open it.";
}


type EventType = {
    timeline: string[],
    eventName: string,
    start: number,
    end: number,
    level: number,
    valid: boolean,
}

type weekType = {
    name: string,
    id: string,
}

type monthType = {
    name: string,
    length: number,
    id: string,
    interval: number,
    offset: number,
}

type seasonType = {
    name: string,
    type: string,
    id: string,

    duration: number,
    peak: number,
    weatherOffset: number,
    weatherPeak: number,
}

type moonType = {
    name: string,
    cycle: number,
    offset: number,
    id: string,
}

import { Chart } from 'chart.js';

export class chartTimeline extends Chart{
    plugin: ChartPlugin;
    //settings: ExamplePluginSettings = Object.assign({}, DEFAULT_SETTINGS);
    name: string = "Default Name";
    id: string = "";
    weekOverflow: boolean = false;

    weekdays: weekType[] = [];
    months: monthType[] = [];
    seasons: seasonType[] = [];
    moons: moonType[] = [];

    yearLength: number = 0;

    currentYear: number = 0;

    

    constructor(context, chartOptions, calendar, plugin){
        super(context, chartOptions);

        this.plugin = plugin;
        this.name = calendar.name;
        this.id = calendar.id;
        this.weekOverflow = calendar.static.overflow;

        for(let day of calendar.static.weekdays){
            this.weekdays.push(day);
        }

        for(let month of calendar.static.months){
            this.yearLength += month.length;
            this.months.push(month);
        }

        for (let season of calendar.seasonal.seasons){
            this.seasons.push(season);
        }

        for (let moon of calendar.static.moons){
            this.moons.push(moon);
        }

        
        
    }

    chartBounds() : {x: {min: number, max: number}, y: {min: number, max: number}} | undefined{
        var bounds = (this.isZoomedOrPanned() ? this.getZoomedScaleBounds() : this.getInitialScaleBounds());
        if(bounds == null || bounds.x == null || bounds.y == null) return {x:{min: 0, max: 100}, y: {min: 0, max: 100}};

        if(bounds.y.max > max_levels - 1) {bounds.y.max = max_levels - 1;}

        this.currentYear = this.returnYearNumber(this.chartMiddle({x: {min: bounds.x.min, max: bounds.x.max}, y: {min: bounds.y.min, max: bounds.y.max}}));
        return {x: {min: bounds.x.min, max: bounds.x.max}, y: {min: bounds.y.min, max: bounds.y.max}};
    }

    chartMiddle(bounds: {x: {min: number, max: number}, y: {min: number, max: number}}){
        return (bounds.x.max + bounds.x.min)/2;
    }

    chartXRangeDiff(): number{
        var bounds = this.chartBounds();
        return Math.abs(bounds.x.max - bounds.x.min);
    }

    barWidthPercentage(values: {from: number, to: number}){
        var width = Math.abs(values.to - values.from);
        return Math.round((width / this.chartXRangeDiff()) * 100);
    }

    returnYearNumber(value: number): number{
        if (value > 0) return Math.round(value / this.yearLength);
        return Math.round((value - year_value - 1) / year_value);
    }

    returnMonthIdx(value:number) : number{
        //var true_value = this.getTrueValue(value);
        //var idx = Math.round(true_value / month_value) % month_value;
        //return idx;

        //gets to within 1 year, so max months.length - 1 loops
        var target = value - Math.sign(value)*Math.ceil(value / this.yearLength) * this.yearLength;
        target = this.getTrueValue(value) % this.yearLength;
        var curr = 0
        var monthIdx = 0;
        while (curr < target){
            if(curr + this.months[monthIdx].length > target) return monthIdx;
            curr += this.months[monthIdx].length;
            monthIdx = (monthIdx + 1) % this.months.length;
        }
        return monthIdx;
    }

    returnDayValue(value: number){
        var true_value = this.getTrueValue(value);
        var idx = Math.round(true_value / day_value) % day_value;
        return idx + 1;
    }

    returnMonthOfYear(value: number){
        var true_value = this.getTrueValue(value);
        var idx = Math.round(true_value / month_value) % year_value;
        return idx + 1;
    }

    returnDayOfMonth(value: number){
        var true_value = this.getTrueValue(value);
        var idx = Math.round(true_value / day_value) % month_value;
        return idx + 1;
    }

    getDateNumberString(value: number){
        var signString = this.returnYearNumber(value) < 0 ? "-" : "";
        return  signString + (Math.abs(this.returnYearNumber(value)).toString().padStart(4,'0')) + "-" + this.returnMonthOfYear(value).toString().padStart(2,'0') + "-" + this.returnDayOfMonth(value).toString().padStart(2,'0');
    }

    getTrueValue(value: number): number{
        //if (value >= 0) return Math.round(value);
        //return Math.abs(value - (this.yearLength - Math.abs(value) % this.yearLength));
        //return Math.round(Math.ceil(Math.abs(value) / this.yearLength ) * this.yearLength - Math.abs(value) % this.yearLength);
        return value < 0 ? Math.round(Math.ceil(Math.abs(value) / this.yearLength ) * this.yearLength - Math.abs(value)) : Math.round(value);
    }

    isLargerThanX(value: number){
        if(value < this.chartXRangeDiff()) return true;
        return false;
    }

    isStartOf(value: number, unit: string){
        var startOfValue
        if (unit == "year") startOfValue = year_value;
        else if (unit == "month") startOfValue = month_value;
        else if (unit == "week") startOfValue = week_value;
        else startOfValue = 1;

        var true_value = this.getTrueValue(value);
        if (Math.round(true_value) === 0) return true;
        return (Math.round(true_value) % startOfValue) === 0;
    }

    isLargerThanYear(chart: Chart){
        if(year_value < this.chartXRangeDiff()) return true;
        return false;
    }

    returnYear(value: number) {
        var signStr = value < 0 ? "-" : " ";
        return signStr + String(Math.abs(this.returnYearNumber(value))).padStart(4,'0');
    }

    returnMonth(value: number) {
        if(this.months == null) return "";
        return this.months[this.returnMonthIdx(value)].name.substr(0,3);
        var true_value = this.getTrueValue(value);
        var idx = Math.floor(true_value / month_value) % data.months.length;
        return (data.months[idx]).substr(0,3);
    }

    returnDay(value: number) {
        var true_value = this.getTrueValue(value);
        var idx = Math.floor(true_value / day_value) % data.weekdays.length;
        return data.weekdays[idx];
    }

    returnDateTimeString(value: number){
        if (this.isLargerThanX(3 * year_value)){
            return this.returnYear(value);
        }
        if(this.isLargerThanX(year_value)){
            return this.returnYear(value) + ":" + this.returnMonth(value);
        }
        if(this.isLargerThanX(month_value)){
            return this.returnMonth(value) + "-" + this.returnDayOfMonth(value);
        }
        return this.returnMonth(value) + "-" + this.returnDayOfMonth(value) + ":" + this.returnDay(value);
    }

    getCurrentYearFormat(){
        if (!this.isZoomedOrPanned()) return "".padStart(4,'0');
        var range = this.chartXRangeDiff();
        var signStr = String(this.currentYear < 0 ? String("-") : String(" "));
        if(range < month_value) return signStr + String(Math.abs(this.currentYear)).padStart(4,'0') + " " + this.returnMonth(this.chartMiddle(this.chartBounds()));
        return  signStr + String(Math.abs(this.currentYear)).padStart(4,'0');
    }


    getValueFromLeftSide(value: number){
        var bounds = this.chartBounds();
        return bounds.x.min + value;
    }

    scaleHieght: number;
    scaleHeightBox: number;

    updateScaleHeight(){
        this.scaleHieght = 0.5 + (this.chartBounds().y.min ?? 0);
    }

    updateScaleHeightBox(){
        this.scaleHeightBox = (this.chartBounds().y.max ?? 0) + 0.5;
    }

    getLine(increment: number, color: string, chart: chartTimeline){
        return {
            xMin: function() {
                return chart.getValueFromLeftSide(increment);
            },
            xMax: function() {
                return chart.getValueFromLeftSide(increment);
            },
            yMin: function() {
                chart.updateScaleHeight();
                return chart.scaleHieght - 1;
            },
            yMax: function() {
                return chart.scaleHieght;
            },
            borderColor: color,
            borderWidth: 2,
        };
    }


    getBox(center: number, width: number, color: string, chart: chartTimeline){
        chart.updateScaleHeightBox();
        return {
            type: 'box',
            xMin: function() {
                return center - width/2;
            },
            xMax: function() {
                return center + width/2;
            },
            yMin: function() {
                return chart.scaleHeightBox - 1;
            },
            yMax: function() {
                return chart.scaleHeightBox;
            },
            backgroundColor: color,
            borderColor: color,
            borderWidth: 2,
        };
    }

    tickString: string;

    getScale(location: number){
        var stepSize;
        
        if(this.isLargerThanX(3 * year_value)){ stepSize = year_value; this.tickString = "year";}
        else if(this.isLargerThanX(year_value)){ stepSize = month_value; this.tickString = "month";}
        else if(this.isLargerThanX(month_value * 3)){ stepSize = 2 * week_value; this.tickString = "2week";}
        else if(this.isLargerThanX(month_value)){ stepSize = week_value; this.tickString = "week";}
        else{ stepSize = day_value; this.tickString = "day";}

        var center = this.chartMiddle(this.chartBounds()) + this.chartXRangeDiff() / 6 + stepSize * location;
        if(center + stepSize > this.chartBounds().x.max) return;
        return this.getBox(center, stepSize, "rgba(112, 112, 112, 0.5)", this);
    }

    lastClick: number;
    myResetZoom(){
        if (Date.now() - this.lastClick < 250){
            this.resetZoom();
            this.update();
        }
        this.lastClick = Date.now();
    }
}





var data:any = [];

var year_value  = 336;
var month_value = 28;
var week_value  = 7;
var day_value   = 1;


function updateVars(){
    var myMonths : string[] = [];
    var tmpYearValue = 0;
    var tmpMonthValue = 0;
    for(let month of myData.calendars[0].static.months){
        myMonths.push(month.name);
        tmpYearValue += month.length;
        tmpMonthValue = month.length;
    }

    var myWeekdays : string[] = [];
    for(let day of myData.calendars[0].static.weekdays){
        myWeekdays.push(day.name);
    }

    data = {
        weekdays: myWeekdays,
        months: myMonths,
        weeks_in_month: 4,
    }

    year_value = tmpYearValue;
    month_value = tmpMonthValue;
    week_value = myData.calendars[0].static.weekdays.length;
    day_value = 1;

    return;
}


var current_year = 0;
var max_levels = 1;


//'rgba(255, 206, 86, 0.2)'
const bar_colors = ['#e74645', '#fb7756', '#facd60', '#fdfa66', '#1ac0c6']
var bar_colors_index = 0;

function getBarColor(){
    return bar_colors[bar_colors_index++ % bar_colors.length];
}

function range_to_data_lvl(range:[number, number], level: number){
    var myData = [];
    for (let i = 0 ; i < (level - 1); i++) myData.push(null);
    myData.push(range);
    return myData;
}



function sortThisEvent(dataList: EventType[], event: EventType, level: number){
    for(let e of dataList){
        var overlapping = e.start <= event.end && event.start <= e.end;
        if(e != event && e.valid && e.level == level && (overlapping)){
            return sortThisEvent(dataList, event, level + 1);
        }
    }
    
    if(level > max_levels) max_levels = level;
    return level;
}

function compareElements(a:{start: number, end: number}, b:{start: number, end: number}){
    return (b.end - b.start) - (a.end - a.start);
}

function sortEvents(datalist: EventType[]){
    var localDataList = datalist.sort(compareElements);
    
    for(let i = 0; i < localDataList.length; i++){
        if(localDataList[i].level > max_levels) max_levels = localDataList[i].level;
        if(localDataList[i].level < 0){
            var event = localDataList[i];
            localDataList[i].level = sortThisEvent(localDataList, event, 1);
        }
        localDataList[i].valid = true;
    }
    
    return localDataList;
}

function getEvents(){
    var dataList = [];
    var Pages = dv.pages().where(t => t.timelines);
    for (let page of Pages) {
        //console.log(page.level);
        var dataObject = {
        timeline: page.timelines,
        eventName: page["fc-display-name"].toString(),
        
        start: tripletToValue(page["fc-date"]),
        end: tripletToValue(page["fc-end"]),
        
        level: page.level == null ? -1 : page.level,
        valid: page.level == null ? false : true,
        }
        
        dataList.push(dataObject);
    }
    return sortEvents(dataList);
}

function tripletToValue(string: string) : number {
    var splitString = String(string).split('-');
    return Number(splitString[0]) * year_value + (Number(splitString[1]) - 1) * month_value + Number(splitString[2]) - 1;
}


function eventsToData(list : EventType[]){			
    var dataListObject = [];
    for(const event of list){
        var dataObject = {
            label: event.eventName,
            data: range_to_data_lvl([event.start,event.end], event.level),
            fill: false,
            backgroundColor: getBarColor(),
            datalabels: {
                align: 'center',
                anchor: 'center',
            }
        };
        dataListObject.push(dataObject);
    }
    return dataListObject;
}


function hex2rgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // return {r, g, b} 
    return { r, g, b };
}

function levels_var_to_array(){
    var myStrings = [];
    for (let i = 0 ; i < max_levels; i++){
        myStrings.push("Level: " + i);
    }
    return myStrings;
}

export function getTimeline(){
    updateVars();
    var Events = getEvents();
    var EventsData = eventsToData(Events);
    var levels = levels_var_to_array();

    const chartData = {
        type: 'bar',
        data: {
            labels: levels,
            datasets: EventsData,
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: {
                y: {
                    stacked: true,
                },
                x: {
                    min: 1,
                    max: 14,
                    ticks: {
                        autoSkip: true,
                        autoSkipPadding: 5,
                        color: function(context) {
                            if(context.chart.isLargerThanX(3 * year_value)){
                                return 'gray';
                            } else if(context.chart.isLargerThanX(year_value)){
                                if (context.chart.isStartOf(context.tick.value, "year")) return 'white';
                            } else if(context.chart.isLargerThanX(month_value)){
                                if (context.chart.isStartOf(context.tick.value, "month")) return 'white';
                            } else if(context.chart.isLargerThanX(week_value)){
                                if (context.chart.isStartOf(context.tick.value, "week")) return 'white';
                            }
                            return 'gray';
                        },
                        callback: function(value: number, index: number, ticks) {
                            if(index === 0 || index === ticks.length - 1) return null;
                            return this.chart.returnDateTimeString(value, ticks);                            
                        },
                    },
                    afterBuildTicks: function(context) {
                        var bounds = context.chart.chartBounds();
                        var stepSize = month_value;
                        if(context.chart.isLargerThanX(3 * year_value)) stepSize = year_value;
                        else if(context.chart.isLargerThanX(year_value)) stepSize = month_value;
                        else if(context.chart.isLargerThanX(month_value * 3)) stepSize = 2 * week_value;
                        else if(context.chart.isLargerThanX(month_value)) stepSize = week_value;
                        else stepSize = day_value;

                        var firstTick = Math.ceil(bounds.x.min / stepSize) * stepSize;

                        var newTicks = [];
                        while(firstTick < bounds.x.max){
                            newTicks.push({value: firstTick});
                            firstTick += stepSize;
                        }

                        context.ticks = newTicks;                    
                    },
                    afterFit: (scale, context) => {
                        //scale.height = 60;
                    }
                },
            },
            plugins: {
                zoom: {
                    onPan: function (context){
                        context.chart.updateScaleHeight();
                        context.chart.updateScaleHeightBox();
                        context.chart.update();
                    },
                    pan: {
                        threshold: 10,
                        enabled: true,
                        mode: 'xy',
                    },
                    limits: {
                        x: {
                            minRange: week_value,
                            min: -year_value * 9999,
                            max: year_value * 9999,
                        },
                        y: {
                            minRange: 2,
                        }
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            modifierKey: 'ctrl',
                        },
                        scaleMode: 'xy',
                    },
                },
                datalabels: {
                    color: function(context){
                        var color = context.dataset.backgroundColor;
                        var monochrome = 0.299 * hex2rgb(color).r + 0.587 * hex2rgb(color).g + 0.114 * hex2rgb(color).b;
                        var monochromeInv = 256 - monochrome;
                        //return "rgb(" + (256 - hex2rgb(color).r) + ", " + (256 - hex2rgb(color).g) + ", " + (256 - hex2rgb(color).b )+ ")";
                        //return "rgb("+monochromeInv+","+monochromeInv+","+monochromeInv+")";
                        if (monochrome > 128) return 'black';
                        return 'white';
                    },
                    display: 'auto',
                    clip: 'true',
                    formatter: function(value: number, context) {
                        var range = {from: 0, to: 1000};
                        for(let thisData of context.dataset.data){
                            if (thisData != null){
                                range = {from: thisData[0], to: thisData[1]};
                            }
                        }
                        var widthPercentage = context.chart.barWidthPercentage(range);
                        return (value != null && widthPercentage > 10) ? context.dataset.label : "";
                    },
                    font: {
                        weight: 'bold'
                    },
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var range = [0,1000];
                            for(let thisData of context.dataset.data) if (thisData != null) range = thisData;
                            return context.chart.getDateNumberString(range[0]) + " - " + context.chart.getDateNumberString(range[1]);
                        },
                        title: function (tooltipItems) { //https://stackoverflow.com/questions/38819171/chart-js-2-0-how-to-change-title-of-tooltip
                            if(tooltipItems.length > 0) {
                                return tooltipItems[0].dataset.label || '';
                            }
                            return '';
                        },
                    }
                },
                title: {
                    display: true,
                    text: function(context){return 'Year:' + context.chart.getCurrentYearFormat();},
                },
                legend: {
                    display: false,
                },
                annotation: {
                    annotations: {
                        bar_major: function(context){
                            return context.chart.getScale(0);
                        },
                        bar_minor_left: function(context){
                            return context.chart.getScale(-1);
                        },
                        bar_minor_right: function(context){
                            return context.chart.getScale(1);
                        },
                        label1: function(context){
                            var center = context.chart.chartMiddle(context.chart.chartBounds()) + context.chart.chartXRangeDiff() / 6;
                            return {
                                type: 'label',
                                color: "rgba(255, 255, 255, 0.5)",
                                xValue: center,
                                yValue: context.chart.scaleHeightBox - 0.5,
                                content: [context.chart.tickString],
                                font: {
                                    size: 12,
                                }
                            }
                        }
                        /*line_base: function(context){return context.chart.getLine(0, "rgba(112, 112, 112, 1)", context.chart);},
                        line_day: function(context){return context.chart.getLine(day_value, "rgba(231, 228, 29, 1)", context.chart);},
                        line_year: function(context){return context.chart.getLine(year_value, "rgba(107, 39, 196, 1)", context.chart);},
                        line_month: function(context){return context.chart.getLine(month_value, "rgba(79, 207, 216, 1)", context.chart);},*/
                    }
                }
            },
            events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
            onClick: function(e, context, chart) {
                chart.myResetZoom();
                return;
                testStringVar = "Clicked!";
                //context.chart.resetZoom('active');
                context.chart.update();
                return;
                const canvasPosition = this.Chart.helpers.getRelativePosition(e, this.chart);

                // Substitute the appropriate scale IDs
                const dataX = this.chart.scales.x.getValueForPixel(canvasPosition.x);
                const dataY = this.chart.scales.y.getValueForPixel(canvasPosition.y);
            },
        }
    };

    return chartData;
}