import {
  MarkdownView,
  Plugin,
  parseYaml,
  Menu,
  Editor,
  View,
  Notice,
  MarkdownPostProcessorContext,
} from 'obsidian';

import Renderer from './chartRenderer';
// import {
//   ChartPluginSettings,
// } from './constants/settingsConstants';
import { renderError } from 'src/util';


import { Chart } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import 'chartjs-adapter-luxon';

import { ExampleSettingTab } from './settings';

export interface ExamplePluginSettings {
  sampleValue: string;
}

export const DEFAULT_SETTINGS: Partial<ExamplePluginSettings> = {
  sampleValue: 'Lorem ipsum',
};

Chart.register(zoomPlugin);
Chart.register(ChartDataLabels);

export default class ChartPlugin extends Plugin {
  renderer: Renderer;
  settings: ExamplePluginSettings;


  postprocessor = async (
    content: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
      await this.renderer.renderFromYaml({}, el, ctx)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async onload() {
    console.log('loading plugin: Charts');

    await this.loadSettings();
    this.addSettingTab(new ExampleSettingTab(this.app, this));

    this.renderer = new Renderer(this);

    //@ts-ignore
    //window.renderChart = this.renderer.renderTimeline;

    this.registerMarkdownCodeBlockProcessor('chart', this.postprocessor.bind(this));
  }

  onunload() {
    console.log('unloading plugin: Charts');
  }
}































/*
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ExampleView, VIEW_TYPE_EXAMPLE } from './view';

export default class ExamplePlugin extends Plugin {
    renderer: Renderer;

    postprocessor = async (
    content: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
      await this.renderer.renderFromYaml({}, el, ctx)
  }

  async onload() {
    this.renderer = new Renderer(this);

    //@ts-ignore
    window.renderChart = this.renderer.renderTimeline;

    this.registerView(
      VIEW_TYPE_EXAMPLE,
      (leaf) => new ExampleView(leaf, this)
    );

    this.addRibbonIcon('dice', 'Activate view', () => {
      this.activateView();
    });
  }

  async onunload() {
  }

  async activateView() {
		const leaf = this.app.workspace.getLeaf('tab');

		leaf.setViewState({
			type: VIEW_TYPE_EXAMPLE,
			active: true,
		});

		this.app.workspace.revealLeaf(leaf);
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    workspace.revealLeaf(leaf);
  }
}*/