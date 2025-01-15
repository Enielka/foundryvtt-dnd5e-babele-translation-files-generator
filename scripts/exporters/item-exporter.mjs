import { AbstractExporter } from './abstract-exporter.mjs';

export class ItemExporter extends AbstractExporter {
  static getDocumentData(document, customMapping) {
    const { name, system } = document;
    const documentData = { name };

    if (system?.description.value) documentData.description = system.description.value;

    AbstractExporter._addCustomMapping(customMapping, document, documentData);

    if (system?.activities) {
      Object.keys(system.activities).forEach(activity => {
        const { name, activation, description, roll, type, _id, profiles } = system.activities[activity];
        const currentActivity = {};
    
        if (name) currentActivity.name = name;
        if (roll?.name) currentActivity.roll = roll.name;
        if (activation?.condition) currentActivity.condition = activation.condition;
        if (description?.chatFlavor) currentActivity.chatFlavor = description.chatFlavor;
    
        if (profiles) {
          const filteredProfiles = profiles
          .filter(({ name }) => name)
          .map(({ name }) => [ name, { name } ]);

          if (AbstractExporter._hasContent(filteredProfiles))
            currentActivity.profiles = Object.fromEntries(filteredProfiles);
        }

        if (Object.keys(currentActivity).length) {
          documentData.activities = documentData.activities ?? {};
          let key = type === "cast" && !name ? _id : name?.length ? name : type;
          key = documentData.activities[key] ? _id : key;
          documentData.activities[key] = currentActivity;
        }
      });
    }

    if (AbstractExporter._hasContent(document.effects)) {
      documentData.effects = {};
      document.effects.forEach(effect => {
        const { _id, name, description, changes } = effect;
        const changesObj = changes.reduce((acc, change) => {
          if (change.key === 'name') acc.name = change.value;
          if (change.key === 'system.description.value') acc['system.description.value'] = change.value;
          return acc;
        }, {});

        const effectData = { name, ...description && { description }, ...Object.keys(changesObj).length && { changes: changesObj } };
        
        const key = documentData.effects[name] && !foundry.utils.objectsEqual(documentData.effects[name], effectData) ? _id : name;
        documentData.effects[key] = effectData;
      });
    }

    if (AbstractExporter._hasContent(system?.advancement)) {
      system.advancement.forEach(({ _id, title, hint }) => {
        const advancementData = { ...title && { title }, ...hint && { hint } };

        if (Object.keys(advancementData).length) {
          documentData.advancement = documentData.advancement ?? {};
          const key = !title?.length || (documentData.advancement[title] && !foundry.utils.objectsEqual(documentData.advancement[title], advancementData)) ? _id : title;
          documentData.advancement[key] = advancementData;
        }
      });
    }

    return documentData;
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const documentData = ItemExporter.getDocumentData(
        foundry.utils.duplicate(await this.pack.getDocument(indexDocument._id)),
        this.options.customMapping.item,
      );

      let key = this.options.useIdAsKey ? indexDocument._id : indexDocument.name;
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? indexDocument._id : key;

      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      this._stepProgressBar();
    }
  }
}
