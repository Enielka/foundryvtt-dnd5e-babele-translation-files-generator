import { AbstractExporter } from './abstract-exporter.mjs';
import { ItemExporter } from './item-exporter.mjs';

export class ActorExporter extends AbstractExporter {
  static getDocumentData(document, customMapping, useItemMapping) {
    const { name, prototypeToken: { name: tokenName } = {}, system: { details: { biography: { value: description } = {} } = {} } } = document;
    const documentData = { ...name && { name }, ...tokenName && { tokenName } };

    if (description) documentData.description = description;

    AbstractExporter._addCustomMapping(customMapping.actor, document, documentData);

    if (AbstractExporter._hasContent(document.items)) {
      documentData.items = {};
      document.items.filter(item => !item._tombstone).forEach(item => {
        const itemData = ItemExporter.getDocumentData(foundry.utils.duplicate(item), useItemMapping ? customMapping.item : {});
        const key = documentData.items[item.name] && !foundry.utils.objectsEqual(documentData.items[item.name], itemData) ? item._id : item.name;
        documentData.items[key] = itemData;
      });
    }

    if (AbstractExporter._hasContent(document.effects)) {
      const conditionsToIgnore = [
        "dnd5eblinded0000", "dnd5eexhaustion0", "dnd5eincapacitat", "dnd5epetrified00", "dnd5erestrained0",
        "dnd5estunned0000", "dnd5epoisoned000", "dnd5einvisible00", "dnd5efrightened0", "dnd5echarmed0000",
        "dnd5edeafened000", "dnd5egrappled000", "dnd5eparalyzed00", "dnd5eprone000000", "dnd5eunconscious"
      ];
      document.effects.filter(effect => !conditionsToIgnore.includes(effect._id) && !effect._tombstone).forEach(effect => {
        documentData.effects = documentData.effects ?? {};
        const { _id, name, description, changes } = effect;
        const changesObj = (changes && Array.isArray(changes)) ? changes.reduce((acc, change) => {
          if (change.key === 'name') acc.name = change.value;
          if (change.key === 'system.description.value') acc['system.description.value'] = change.value;
          return acc;
        }, {}) : {};

        const effectData = { name, ...description && { description }, ...Object.keys(changesObj).length && { changes: changesObj } };

        const key = documentData.effects[name] && !foundry.utils.objectsEqual(documentData.effects[name], effectData) ? _id : name;
        documentData.effects[key] = effectData;
      });
    }

    return documentData;
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const documentData = ActorExporter.getDocumentData(
        await this.pack.getDocument(indexDocument._id),
        this.options.customMapping,
        true
      );

      let key = this.options.useIdAsKey ? indexDocument._id : indexDocument.name;
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? indexDocument._id : key;

      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      this._stepProgressBar();
    }
  }
}
