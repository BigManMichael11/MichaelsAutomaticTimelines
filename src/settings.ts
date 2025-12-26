import ChartPlugin from './main';
import { App, PluginSettingTab, Setting } from 'obsidian';


export class ExampleSettingTab extends PluginSettingTab {
  plugin: ChartPlugin;

  constructor(app: App, plugin: ChartPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Default value')
      .addText((text) =>
        text
          .setPlaceholder('Lorem ipsum')
          .setValue(this.plugin.settings.sampleValue)
          .onChange(async (value) => {
            this.plugin.settings.sampleValue = value;
            await this.plugin.saveSettings();
          })
      );
  }
}