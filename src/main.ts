import { Plugin, MarkdownPostProcessorContext } from "obsidian";

import Renderer from "./chartRenderer";

import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import ChartDataLabels from "chartjs-plugin-datalabels";

import "chartjs-adapter-luxon";

import { ExampleSettingTab } from "./settings";

export interface ExamplePluginSettings {
  sampleValue: string;
}

export const DEFAULT_SETTINGS: Partial<ExamplePluginSettings> = {
  sampleValue: "Lorem ipsum",
};

Chart.register(zoomPlugin);
Chart.register(ChartDataLabels);

export default class ChartPlugin extends Plugin {
  renderer: Renderer;
  settings: ExamplePluginSettings;

  postprocessor = async (
    content: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ) => {
    await this.renderer.renderFromYaml({}, el, ctx);
  };

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async onload() {
    console.log("loading plugin: Charts");

    await this.loadSettings();
    this.addSettingTab(new ExampleSettingTab(this.app, this));

    this.renderer = new Renderer(this);

    //@ts-ignore
    //window.renderChart = this.renderer.renderTimeline;

    this.registerMarkdownCodeBlockProcessor(
      "chart",
      this.postprocessor.bind(this),
    );
  }

  onunload() {
    console.log("unloading plugin: Charts");
  }
}
