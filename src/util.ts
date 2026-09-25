import type ChartPlugin from "src/main";
import { DEFAULT_SETTINGS, ExamplePluginSettings } from "src/main";

import { getAPI as dataviewGetAPI } from "obsidian-dataview";

const dv = dataviewGetAPI();

import myData from "../../calendarium/data.json";

import type {
  CalendarAPI,
  Calendar,
  CalDate,
  CalEvent,
} from "../../calendarium/main";

import type { Readable, Writable } from "svelte/store";

import { get } from "svelte/store";

export function renderError(error: any, el: HTMLElement) {
  const errorEl = el.createDiv({ cls: "chart-error" });
  errorEl.createEl("b", { text: "Couldn't render Chart:" });
  errorEl
    .createEl("pre")
    .createEl("code", { text: error.toString?.() ?? error });
  errorEl.createEl("hr");
  errorEl.createEl("span").innerHTML =
    "You might also want to look for further Errors in the Console: Press <kbd>CTRL</kbd> + <kbd>SHIFT</kbd> + <kbd>I</kbd> to open it.";
}

const CHART_SCALE_MIN = 1;
const CHART_SCALE_MAX = 14;

const CALENDAR_NAME = "Alchos";
var calendarAPI = window.Calendarium.getAPI(CALENDAR_NAME);

var chartSize: ChartSize = null;

type ChartSize = {
  widthpx: number;
  heightpx: number;
  widthValue: number;
};

type weekType = {
  name: string;
  id: string;
};

type monthType = {
  name: string;
  length: number;
  id: string;
  interval: number;
  offset: number;
};

type seasonType = {
  name: string;
  type: string;
  id: string;

  duration: number;
  peak: number;
  weatherOffset: number;
  weatherPeak: number;
};

type moonType = {
  name: string;
  cycle: number;
  offset: number;
  id: string;
};

type ChartBounds = {
  x: { min: number; max: number };
  y: { min: number; max: number };
};

type EventsType = CalEvent & {
  timeline: string;
  eventName: string;

  level: number;
};

import { Chart } from "chart.js";

export class chartTimeline extends Chart {
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
  ownPath: string = "";

  mChartBounds: ChartBounds = {
    x: { min: 0, max: 100 },
    y: { min: 0, max: 100 },
  };

  mCalendarAPI: CalendarAPI;
  mCalendarStore;
  mYearLength: number = 365;

  constructor(context, chartOptions, calendar, plugin, ownPath: string) {
    super(context, chartOptions);

    this.plugin = plugin;
    this.name = calendar.name;
    this.id = calendar.id;
    this.weekOverflow = calendar.static.overflow;
    this.ownPath = ownPath;

    for (let day of calendar.static.weekdays) {
      this.weekdays.push(day);
    }

    for (let month of calendar.static.months) {
      this.yearLength += month.length;
      this.months.push(month);
    }

    for (let season of calendar.seasonal.seasons) {
      this.seasons.push(season);
    }

    for (let moon of calendar.static.moons) {
      this.moons.push(moon);
    }

    var store = calendarAPI.getStore();
    var monthStore = store.getMonthStoreForDate({ year: 2, month: 3, day: 1 });
    var yearStore = store.getYearStoreForDate({ year: 2, month: 0, day: 0 });
    this.mYearLength = get(yearStore.daysBefore);
    // console.log(this.mYearLength);

    // console.log("Calendarapi");
    // console.log(calendarAPI);
    // console.log("store");
    // console.log(store);
    // console.log("month store");
    // console.log(monthStore);
    // console.log("year store");
    // console.log(yearStore);
    // console.log(get(yearStore.daysBefore));
    // console.log(get(yearStore.leapDays));

    // console.log("ephemeral store");
    // console.log(calendarAPI.getStore().getEphemeralStore());

    // console.log("week subscribe");
    // console.log(get(monthStore.days)); //32
    // console.log(get(monthStore.daysAsWeeks)); //array of 4 weeks with empty days filled in
    // console.log(get(monthStore.daysBefore)); //32
    // console.log(get(monthStore.daysBeforeAll)); //32
    // console.log(get(monthStore.eras)); //empty
    // console.log("first day");
    // console.log(get(monthStore.firstDay)); //0
    // console.log(get(monthStore.firstWeekNumber)); //4
    // console.log(get(monthStore.index)); //1
    // console.log(get(monthStore.lastDay)); //7
    // console.log(get(monthStore.leapDays)); //empty array
    // console.log(get(monthStore.weekdays)); //weekdays filled out
    // console.log(get(monthStore.weeks)); //4

    this.mCalendarAPI = window.Calendarium.getAPI(CALENDAR_NAME);
    this.mCalendarStore = this.mCalendarAPI.getStore();
  }

  getOffsetDate(date: CalDate, offset: number): CalDate {
    if (!this.mCalendarStore) return { year: 1, month: 0, day: 0 };
    var localDate: CalDate = date;
    var localOffset: number = Math.floor(offset % this.mYearLength);
    localDate.year = Math.floor(date.year + offset / this.mYearLength);
    return this.mCalendarStore.getOffsetDate(localDate, localOffset);
  }

  getDaysBeforeDate(date: CalDate) {
    if (!this.mCalendarStore) return 0;
    return this.mCalendarStore.getDaysBeforeDate(date);
  }

  getMonthStoreForDate(date: CalDate) {
    return this.mCalendarStore.getMonthStoreForDate(date);
  }

  onPan() {
    this.updateCurrentYear();
    this.chartBounds();
  }

  onZoom() {
    this.updateCurrentYear();
    this.chartBounds();
  }

  updateCurrentYear() {
    this.currentYear = this.returnYearNumber(
      this.chartMiddle({
        x: { min: this.mChartBounds.x.min, max: this.mChartBounds.x.max },
        y: { min: this.mChartBounds.y.min, max: this.mChartBounds.y.max },
      }),
    );
    return;
  }

  chartBounds():
    | { x: { min: number; max: number }; y: { min: number; max: number } }
    | undefined {
    var bounds = this.isZoomedOrPanned()
      ? this.getZoomedScaleBounds()
      : this.getInitialScaleBounds();
    if (bounds == null || bounds.x == null || bounds.y == null)
      return { x: { min: 0, max: 100 }, y: { min: 0, max: 100 } };

    if (bounds.y.max > max_levels - 1) {
      bounds.y.max = max_levels - 1;
    }

    this.mChartBounds = {
      x: { min: bounds.x.min, max: bounds.x.max },
      y: { min: bounds.y.min, max: bounds.y.max },
    };

    return this.mChartBounds;
  }

  chartMiddle(bounds: {
    x: { min: number; max: number };
    y: { min: number; max: number };
  }) {
    return (bounds.x.max + bounds.x.min) / 2;
  }

  chartXRangeDiff(): number {
    var bounds = this.chartBounds();
    return Math.abs(bounds.x.max - bounds.x.min);
  }

  barWidthPercentage(values: { from: number; to: number }) {
    var width = Math.abs(values.to - values.from);
    return Math.round((width / this.chartXRangeDiff()) * 100);
  }

  returnYearNumber(value: number): number {
    var date: CalDate = this.getOffsetDate(
      { year: 1, month: 0, day: 0 },
      Math.abs(value),
    );

    if (value < 0) {
      return -date.year;
    }
    return date.year;
  }

  getTrueValue(value: number): number {
    //if (value >= 0) return Math.round(value);
    //return Math.abs(value - (this.yearLength - Math.abs(value) % this.yearLength));
    //return Math.round(Math.ceil(Math.abs(value) / this.yearLength ) * this.yearLength - Math.abs(value) % this.yearLength);
    return value < 0
      ? Math.round(
          Math.ceil(Math.abs(value) / this.yearLength) * this.yearLength -
            Math.abs(value),
        )
      : Math.round(value);
  }

  isLargerThanX(date: CalDate): boolean {
    var daysBefore = this.getDaysBeforeDate(date);
    return daysBefore < this.chartXRangeDiff() ? true : false;
  }

  returnMonth(date: CalDate): string {
    if (!date) return "Inv";
    var monthStore = this.getMonthStoreForDate(date);
    if (!monthStore.month) {
      return "Inv";
    }
    var monthStr = monthStore.month.name.substr(0, 3);
    return monthStr;
  }

  returnDay(date: CalDate) {
    if (!date) return "Inv";
    var monthStore = this.getMonthStoreForDate(date);
    var firstDay: number = get(monthStore.firstDay);
    if (firstDay == null) return "Inv";
    var weekDays = get(monthStore.weekdays);
    if (weekDays == null) return "Inv";
    var dayStr = weekDays[(firstDay + date.day) % weekDays.length].name.substr(
      0,
      3,
    );
    return dayStr;
  }

  returnDateTimeString(value: number) {
    if (!this.mCalendarStore) return "";
    // days are from year 1, so offset year by 1
    var date: CalDate = this.getOffsetDate(
      { year: 1, month: 0, day: 0 },
      Math.floor(Math.abs(value)),
    );

    if (value <= 0) {
      date.year = date.year; //@todo invert year value to negatives
      date.month = 11 - date.month;
      date.day = 32 - date.day;
    }

    var yearString: string = date.year + "";

    if (this.isLargerThanX({ year: 4, month: 0, day: 0 })) {
      return yearString.padStart(4, "0");
    } else if (this.isLargerThanX({ year: 2, month: 0, day: 0 })) {
      return yearString.padStart(4, "0") + ":" + this.returnMonth(date);
    } else if (this.isLargerThanX({ year: 1, month: 1, day: 0 })) {
      return this.returnMonth(date) + "-" + date.day;
    } else {
      return date.day + ":" + this.returnDay(date);
    }
  }

  getCurrentYearFormat() {
    return this.returnDateTimeString(this.chartMiddle(this.chartBounds()) - 1);
  }

  getValueFromLeftSide(value: number) {
    var bounds = this.chartBounds();
    return bounds.x.min + value;
  }

  scaleHieght: number;
  scaleHeightBox: number;

  updateScaleHeight() {
    this.scaleHieght = 0.5 + (this.chartBounds().y.min ?? 0);
  }

  updateScaleHeightBox() {
    this.scaleHeightBox = (this.chartBounds().y.max ?? 0) + 0.5;
  }

  getLine(increment: number, color: string, chart: chartTimeline) {
    return {
      xMin: function () {
        return chart.getValueFromLeftSide(increment);
      },
      xMax: function () {
        return chart.getValueFromLeftSide(increment);
      },
      yMin: function () {
        chart.updateScaleHeight();
        return chart.scaleHieght - 1;
      },
      yMax: function () {
        return chart.scaleHieght;
      },
      borderColor: color,
      borderWidth: 2,
    };
  }

  getBox(center: number, width: number, color: string, chart: chartTimeline) {
    chart.updateScaleHeightBox();
    return {
      type: "box",
      xMin: function () {
        return center - width / 2;
      },
      xMax: function () {
        return center + width / 2;
      },
      yMin: function () {
        return chart.scaleHeightBox - 1;
      },
      yMax: function () {
        return chart.scaleHeightBox;
      },
      backgroundColor: color,
      borderColor: color,
      borderWidth: 2,
    };
  }
}

var data: any = [];

var month_value = 28;
var week_value = 7;
var day_value = 1;
var MIN_BAR_LENGTH = 1;

function updateVars(ownPath: string) {
  var myMonths: string[] = [];
  var tmpYearValue = 0;
  var tmpMonthValue = 0;
  for (let month of myData.calendars[0].static.months) {
    myMonths.push(month.name);
    tmpYearValue += month.length;
    tmpMonthValue = month.length;
  }

  var myWeekdays: string[] = [];
  for (let day of myData.calendars[0].static.weekdays) {
    myWeekdays.push(day.name);
  }

  data = {
    weekdays: myWeekdays,
    months: myMonths,
    weeks_in_month: 4,
  };

  month_value = tmpMonthValue;
  week_value = myData.calendars[0].static.weekdays.length;
  day_value = 1;

  return;
}

var max_levels = 1;

//'rgba(255, 206, 86, 0.2)'
const bar_colors = ["#e74645", "#fb7756", "#facd60", "#fdfa66", "#1ac0c6"];
var bar_colors_index = 0;

function getBarColor() {
  return bar_colors[bar_colors_index++ % bar_colors.length];
}

function range_to_data_lvl(range: [number, number], level: number) {
  if (level < 1) return [[start, end]];
  var myData = Array(level - 1).fill(null);
  // for (let i = 0 ; i < (level - 1); i++) myData.push(null);

  var start: number = range[0];
  var end: number = range[1];

  myData.push([start, end]);
  return myData;
}

function isOverLapping(a: EventsType, b: EventsType): boolean {
  var localAStart, localAEnd, localBStart, localBEnd: number;
  localAStart = calendarAPI.getStore().getDaysBeforeDate(a.date);
  localAEnd = a.end
    ? calendarAPI.getStore().getDaysBeforeDate(a.end)
    : localAStart;
  localBStart = calendarAPI.getStore().getDaysBeforeDate(b.date);
  localBEnd = b.end
    ? calendarAPI.getStore().getDaysBeforeDate(b.end)
    : localBStart;

  if (localAStart <= localBEnd && localBStart <= localAEnd) return true;
  return false;
}

function getLevel(listByLevel: EventsType[][], event: EventsType) {
  var i;
  for (i = 0; i < listByLevel.length; i++) {
    if (listByLevel[i].length == 0) {
      listByLevel[i].push(event);
      return i;
    }
    var foundOverlap = false;
    for (let j = 0; j < listByLevel[i].length; j++) {
      if (isOverLapping(listByLevel[i][j], event)) {
        foundOverlap = true;
        break;
      }
    }
    if (!foundOverlap) {
      listByLevel[i].push(event);
      return i;
    }
  }
  listByLevel.push([]);
  listByLevel[i].push(event);
  return i;
}

function sortEvents(datalist: EventsType) {
  var localDataList = datalist;
  localDataList = localDataList.sort((a, b) => {
    if ("end" in a && "end" in b) {
      var localAStart = calendarAPI.getStore().getDaysBeforeDate(a.date);
      var localAEnd = a.end
        ? calendarAPI.getStore().getDaysBeforeDate(a.end)
        : localAStart;
      var localBStart = calendarAPI.getStore().getDaysBeforeDate(b.date);
      var localBEnd = b.end
        ? calendarAPI.getStore().getDaysBeforeDate(b.end)
        : localBStart;
      return localBEnd - localBStart - (localAEnd - localAStart);
    }
    if ("end" in a) return -1;
    return 1;
  });
  var listByLevel: EventsType[][] = [[]];
  for (let i = 0; i < localDataList.length; i++) {
    localDataList[i].level = getLevel(listByLevel, localDataList[i]) + 1;
    max_levels = listByLevel.length;
  }
  return localDataList;
}

function getEvents(ownPath: string): EventsType[] {
  var calendarEvents: EventsType[] = sortEvents(calendarAPI.getEvents());

  Object.keys(calendarEvents).forEach((key) => {
    calendarEvents[key].timeline = calendarAPI.getObject().name;
    calendarEvents[key].level = -1;
  });
  return calendarEvents;
}

function eventsToData(list: EventsType) {
  var dataListObject = [];
  list = sortEvents(list);
  for (const event of list) {
    var daysBefore = calendarAPI.getStore().getDaysBeforeDate(event.date);
    var daysBeforeEnd = daysBefore + 1;
    if (event.end) {
      daysBeforeEnd = Math.max(
        calendarAPI.getStore().getDaysBeforeDate(event.end),
        daysBeforeEnd,
      );
    }
    var dataObject = {
      label: event.name,
      data: range_to_data_lvl([daysBefore, daysBeforeEnd], event.level),
      level: event.level,
      fill: false,
      backgroundColor: getBarColor(),
      datalabels: {
        align: "center",
        anchor: "center",
      },
      minBarLength: MIN_BAR_LENGTH,
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

function levels_var_to_array() {
  var levelString: string[] = [];
  for (let i: number = 0; i < max_levels; i++) {
    levelString.push(`Level: ${i}`);
  }
  return levelString;
}

type ClickCallback = {
  bounds: { top: number; bottom: number; left: number; right: number };
  callback: (ctx, click) => void;
};

var ZOOM_BUTTON_PLUS_IDX: number = null;
var ZOOM_BUTTON_MINUS_IDX: number = null;
let clickButtonCallbacks: ClickCallback[] = [];

const zoomButton = {
  id: "zoomButton",
  beforeDraw(chart, args, options) {
    const {
      ctx,
      chartArea: { top, right, bottom, left, width, height },
    } = chart;
    ctx.save();

    ctx.font = "16px Arial";
    const plusText = "+";
    const plusTextWidth = ctx.measureText(plusText).width;
    const plusTextHeight = 16 / 2; //for 16px
    const minusTextHeight = 16 / 4; //for 16px
    const minusText = "-";
    const minusTextWidth = ctx.measureText(minusText).width;

    var buttonCoordinatesPlus = {
      top: 10,
      bottom: 30,
      left: right - (plusTextWidth + 5),
      right: right,
    };
    var buttonCoordinatesMinus = {
      top: 10,
      bottom: 30,
      left: right - (plusTextWidth + 5) - (plusTextWidth + 5),
      right: right - (plusTextWidth + 5),
    };

    ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
    ctx.fillRect(
      buttonCoordinatesPlus.left,
      buttonCoordinatesPlus.top,
      buttonCoordinatesPlus.right - buttonCoordinatesPlus.left,
      buttonCoordinatesPlus.bottom - buttonCoordinatesPlus.top,
    );
    ctx.fillRect(
      buttonCoordinatesMinus.left,
      buttonCoordinatesMinus.top,
      buttonCoordinatesMinus.right - buttonCoordinatesMinus.left,
      buttonCoordinatesMinus.bottom - buttonCoordinatesMinus.top,
    );

    ctx.strokeStyle = "rgba(14, 113, 226, 0.2)";
    ctx.strokeRect(
      buttonCoordinatesPlus.left,
      buttonCoordinatesPlus.top,
      buttonCoordinatesPlus.right - buttonCoordinatesPlus.left,
      buttonCoordinatesPlus.bottom - buttonCoordinatesPlus.top,
    );
    ctx.strokeRect(
      buttonCoordinatesMinus.left,
      buttonCoordinatesMinus.top,
      buttonCoordinatesMinus.right - buttonCoordinatesMinus.left,
      buttonCoordinatesMinus.bottom - buttonCoordinatesMinus.top,
    );

    ctx.fillStyle = "#377fd1ff";
    ctx.textAlign = "center";

    var plusCenterX =
      buttonCoordinatesPlus.left +
      (buttonCoordinatesPlus.right - buttonCoordinatesPlus.left) / 2;
    var plusCenterY =
      buttonCoordinatesPlus.top +
      (buttonCoordinatesPlus.bottom - buttonCoordinatesPlus.top) / 2 +
      plusTextHeight / 2;
    ctx.fillText(plusText, plusCenterX, plusCenterY);

    var minusCenterX =
      buttonCoordinatesMinus.left +
      (buttonCoordinatesMinus.right - buttonCoordinatesMinus.left) / 2;
    var minusCenterY =
      buttonCoordinatesMinus.top +
      (buttonCoordinatesMinus.bottom - buttonCoordinatesMinus.top) / 2 +
      minusTextHeight / 2;
    ctx.fillText(minusText, minusCenterX, minusCenterY);

    if (ZOOM_BUTTON_PLUS_IDX == null) {
      clickButtonCallbacks.push({
        bounds: buttonCoordinatesPlus,
        callback: zoomButtonPlusCallback,
      });
      ZOOM_BUTTON_PLUS_IDX = clickButtonCallbacks.length - 1;
    } else {
      clickButtonCallbacks[ZOOM_BUTTON_PLUS_IDX] = {
        bounds: buttonCoordinatesPlus,
        callback: zoomButtonPlusCallback,
      };
    }

    if (ZOOM_BUTTON_MINUS_IDX == null) {
      clickButtonCallbacks.push({
        bounds: buttonCoordinatesMinus,
        callback: zoomButtonMinusCallback,
      });
      ZOOM_BUTTON_MINUS_IDX = clickButtonCallbacks.length - 1;
    } else {
      clickButtonCallbacks[ZOOM_BUTTON_MINUS_IDX] = {
        bounds: buttonCoordinatesMinus,
        callback: zoomButtonMinusCallback,
      };
    }

    ctx.restore();
  },
};

const ZOOM_INCREMENT_SMALL = 1.5;
const ZOOM_INCREMENT_LARGE = 2;

function zoomButtonPlusCallback(ctx, click) {
  let zoomAmount: number = ZOOM_INCREMENT_SMALL;
  if (click.altKey) zoomAmount = ZOOM_INCREMENT_LARGE;
  ctx.zoom({ x: zoomAmount, y: 0 });
}

function zoomButtonMinusCallback(ctx, click) {
  let zoomAmount: number = 1 / (ZOOM_INCREMENT_SMALL * 2);
  if (click.altKey) zoomAmount = 1 / (ZOOM_INCREMENT_LARGE * 2);
  ctx.zoom({ x: zoomAmount, y: 0 });
}

export function clickButtonHandler(ctx, click, chart) {
  for (let i = 0; i < clickButtonCallbacks.length; i++) {
    if (
      click.offsetX >= clickButtonCallbacks[i].bounds.left &&
      click.offsetX <= clickButtonCallbacks[i].bounds.right &&
      click.offsetY >= clickButtonCallbacks[i].bounds.top &&
      click.offsetY <= clickButtonCallbacks[i].bounds.bottom
    ) {
      clickButtonCallbacks[i].callback(chart, click);
      // return;
    }
  }

  // clickButtonCallbacks.ZOOM_BUTTON.callback(ctx, click);
}

function getLastPowerOf(value: number) {
  return Math.pow(10, Math.ceil(Math.log10(value)));
}

function incrementTick(tick: number, stepSize: number): number {
  if (stepSize >= 384) {
    if (tick < 0 && tick > -stepSize) return 0;
    else if (tick == 0 && stepSize > 384) return stepSize - 384;
    else return tick + stepSize;
  } else {
    return tick + stepSize;
  }
}

var lastZoomUpdate: number = 0;

export function getTimeline(
  ownPath: string,
  initialChartSizepx: { widthpx: number; heightpx: number },
) {
  updateVars(ownPath);
  var Events: EventsType[] = getEvents(ownPath);
  console.log("Events");
  console.log(Events);

  if (chartSize == null) {
    chartSize = {
      widthpx: initialChartSizepx.widthpx,
      heightpx: initialChartSizepx.heightpx,
      widthValue: CHART_SCALE_MAX - CHART_SCALE_MIN,
    };
  } else {
    chartSize.widthValue = CHART_SCALE_MAX - CHART_SCALE_MIN;
  }

  // chartSize = {widthpx: initialChartSizepx.widthpx, heightpx: initialChartSizepx.heightpx, widthValue:  latestEvent - earliestEvent};
  var EventsData = eventsToData(Events);
  var levels = levels_var_to_array();

  console.log("EventsData");
  console.log(EventsData);

  const chartData = {
    type: "bar",
    data: {
      labels: levels,
      datasets: EventsData,
    },
    plugins: [zoomButton],
    options: {
      responsive: true,
      indexAxis: "y",
      scales: {
        y: {
          stacked: true,
        },
        x: {
          min: CHART_SCALE_MIN,
          max: 32 * 12 * 10000,
          ticks: {
            autoSkip: true,
            autoSkipPadding: 5,
            color: function (context) {
              var date: CalDate = context.chart.getOffsetDate(
                { year: 1, month: 0, day: 0 },
                Math.abs(Math.abs(context.tick.value)),
              );

              // days are from year 1, so offset year by 1
              if (context.chart.isLargerThanX({ year: 4, month: 0, day: 0 })) {
                return "gray";
              } else if (
                context.chart.isLargerThanX({ year: 2, month: 0, day: 0 })
              ) {
                if (date.month == 0) return "white";
              } else if (
                context.chart.isLargerThanX({ year: 1, month: 1, day: 0 })
              ) {
                if (date.day == 0) return "white";
                // @TODO fill in real day value for a week
                // @TODO Fix day of week checking
              } else if (
                context.chart.isLargerThanX({ year: 1, month: 0, day: 7 })
              ) {
                if (date.day % 7 == 0) return "white";
              }
              return "gray";
            },
            callback: function (value: number, index: number, ticks) {
              if (index === 0 || index === ticks.length - 1) return null;
              return this.chart.returnDateTimeString(value);
            },
          },
          afterBuildTicks: function (context) {
            var bounds = context.chart.chartBounds();
            var stepSize = month_value;

            if (context.chart.isLargerThanX({ year: 4, month: 0, day: 0 })) {
              var rangeYears = Math.floor(bounds.x.max - bounds.x.min) / 384;
              stepSize = getLastPowerOf(rangeYears / 25);
              stepSize = stepSize * 384;
            } else if (
              context.chart.isLargerThanX({ year: 2, month: 0, day: 0 })
            )
              stepSize = 32 * 4;
            else if (context.chart.isLargerThanX({ year: 1, month: 3, day: 0 }))
              stepSize = 32;
            else if (context.chart.isLargerThanX({ year: 1, month: 1, day: 0 }))
              stepSize = 8;
            else stepSize = 1;

            var firstTick = Math.floor(bounds.x.min / stepSize) * stepSize;
            if (stepSize >= 384) {
              if (bounds.x.min < -384) {
                firstTick += 384;
              } else if (bounds.x.min > 384) {
                firstTick -= 384;
              }
            }

            var newTicks = [];
            while (firstTick < bounds.x.max) {
              if (firstTick >= bounds.x.min)
                newTicks.push({ value: firstTick });
              firstTick = incrementTick(firstTick, stepSize);
            }

            if (newTicks.length < 2) {
              console.log(
                `short ticks! stepSize ${stepSize} range ${bounds.x.max - bounds.x.min}`,
              );
              console.log(newTicks);
            }

            context.ticks = newTicks;
          },
          afterFit: (scale, context) => {
            //scale.height = 60;
          },
        },
      },
      plugins: {
        zoom: {
          pan: {
            threshold: 10,
            enabled: true,
            mode: "xy",
            onPan: function (context) {
              context.chart.onPan();
              context.chart.updateScaleHeight();
              context.chart.updateScaleHeightBox();
              context.chart.update();
            },
          },
          limits: {
            x: {
              minRange: week_value,
              min: -32 * 12 * 10000,
              max: 32 * 12 * 10000,
            },
            y: {
              minRange: 2,
            },
          },
          zoom: {
            wheel: {
              enabled: true,
              modifierKey: "ctrl",
            },
            scaleMode: "xy",
            onZoomComplete: function (context) {
              if (Date.now() >= lastZoomUpdate + 500 || lastZoomUpdate == 0) {
                setTimeout(delayedZoomFunction(context), 500);
                lastZoomUpdate = Date.now();
              }
              context.chart.onZoom();
              context.chart.update();
            },
          },
        },
        datalabels: {
          color: function (context) {
            var color = context.dataset.backgroundColor;
            var monochrome =
              0.299 * hex2rgb(color).r +
              0.587 * hex2rgb(color).g +
              0.114 * hex2rgb(color).b;
            var monochromeInv = 256 - monochrome;
            //return "rgb(" + (256 - hex2rgb(color).r) + ", " + (256 - hex2rgb(color).g) + ", " + (256 - hex2rgb(color).b )+ ")";
            //return "rgb("+monochromeInv+","+monochromeInv+","+monochromeInv+")";
            if (monochrome > 128) return "black";
            return "white";
          },
          display: "auto",
          clip: "true",
          formatter: function (value: number, context) {
            var range = { from: 0, to: 1000 };
            for (let thisData of context.dataset.data) {
              if (thisData != null) {
                range = { from: thisData[0], to: thisData[1] };
              }
            }
            var widthPercentage = context.chart.barWidthPercentage(range);
            return value != null && widthPercentage > 10
              ? context.dataset.label
              : "";
          },
          font: {
            weight: "bold",
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              var startDate: CalDate = context.chart.getOffsetDate(
                {
                  year: 1,
                  month: 0,
                  day: 0,
                },
                Math.abs(Math.floor(context.dataset.data.at(-1).at(0))),
              );
              return calendarAPI.toDisplayDate(
                context.chart.mCalendarStore.getNextDay(startDate),
              );
            },
            title: function (tooltipItems) {
              // https://stackoverflow.com/questions/38819171/chart-js-2-0-how-to-change-title-of-tooltip
              if (tooltipItems.length > 0) {
                return tooltipItems[0].dataset.label || "";
              }
              return "";
            },
          },
        },
        title: {
          display: true,
          text: function (context) {
            return "Year:" + context.chart.getCurrentYearFormat();
          },
        },
        legend: {
          display: false,
        },
      },
      events: ["mousemove", "mouseout", "click", "touchstart", "touchmove"],
      onClick: function (e, context, chart) {
        return;
      },
    },
  };
  console.log(chartData);
  return chartData;
}
