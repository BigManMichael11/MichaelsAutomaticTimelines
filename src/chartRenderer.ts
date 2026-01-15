import { Chart, registerables } from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import { renderError } from 'src/util';
import type ChartPlugin from 'src/main';
import annotationPlugin from 'chartjs-plugin-annotation'

import { getTimeline } from 'src/util';

import { getAPI } from "obsidian-dataview";
const dv = getAPI();

Chart.register(...registerables, annotationPlugin, SankeyController, Flow);

import {chartTimeline} from "src/util";
import myData from "../../calendarium/data.json";

export default class Renderer {
    plugin: ChartPlugin;

    constructor(plugin: ChartPlugin) {
        this.plugin = plugin;
    }

    renderTimeline(data: any, el: HTMLElement, ownPath: string): chartTimeline {
        const destination = el.createEl('canvas');
        // console.log(destination.getContext("2d"));
        //let chart = new Chart(destination.getContext("2d"), getTimeline());
        var chartSizepx = {widthpx: destination.clientWidth, heightpx: destination.clientHeight};
        let chart = new chartTimeline(destination.getContext("2d"), getTimeline(ownPath, chartSizepx), myData.calendars[0], this.plugin, ownPath);


        chart.updateScaleHeight();
        chart.updateScaleHeightBox();
        chart.update();

       // console.log(this.plugin.settings.sampleValue);

        return chart;
    }

    async renderFromYaml(yaml: any, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        this.plugin.app.workspace.onLayoutReady(() => ctx.addChild(new ChartRenderChild(yaml, el, this, ctx.sourcePath)));
    }
}
















class ChartRenderChild extends MarkdownRenderChild {
    data: any;
    chart: null | Chart;
    renderer: Renderer;
    ownPath: string;
    el: HTMLElement;

    constructor(data: any, el: HTMLElement, renderer: Renderer, ownPath: string) {
        super(el);
        this.el = el;
        this.data = data;
        this.renderer = renderer;
        this.ownPath = ownPath;
        this.changeHandler = this.changeHandler.bind(this);
        this.reload = this.reload.bind(this);
    }

    async onload() {
        try {
            // console.log("Rendering timeline for ", this.containerEl);
            this.chart = this.renderer.renderTimeline(this.data, this.containerEl, this.ownPath);
        } catch (error) {
            renderError(error, this.el);
        }
        if (this.data.id) {
            this.renderer.plugin.app.metadataCache.on("changed", this.changeHandler);
        }
        this.renderer.plugin.app.workspace.on('css-change', this.reload);
    }

    changeHandler(file: TFile) {
        if (this.data.file ? file.basename === this.data.file : file.path === this.ownPath) {
            this.reload();
        }
    }

    reload() {
        this.onunload();
        this.onload();
    }

    onunload() {
        this.renderer.plugin.app.metadataCache.off("changed", this.changeHandler);
        this.renderer.plugin.app.workspace.off('css-change', this.reload);
        this.el.empty();
        this.chart && this.chart.destroy();
        this.chart = null;
    }
}