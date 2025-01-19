import { AbstractExporter } from './abstract-exporter.mjs';
import { ItemExporter } from './item-exporter.mjs';

export class ActorExporter extends AbstractExporter {
  static getDocumentData(document, customMapping, useItemMapping) {
    const { name, prototypeToken: { name: tokenName } = {}, system: { details: { biography: { value: description } = {} } = {} } } = document;
    const documentData = { ...name && { name }, ...tokenName && { tokenName } };

    if (description) documentData.description = description;

    this._addCustomMapping(customMapping.actor, document, documentData);

    if (this._hasContent(document.items)) {
      documentData.items = {};
      document.items.filter(item => !item._tombstone).forEach(item => {
        const itemData = ItemExporter.getDocumentData(foundry.utils.duplicate(item), useItemMapping ? customMapping.item : {});
        const key = documentData.items[item.name] && !foundry.utils.objectsEqual(documentData.items[item.name], itemData) ? item._id : item.name;
        documentData.items[key] = itemData;
      });
    }

    if (this._hasContent(document.effects)) {
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
  
  static addBaseMapping(mapping, document, documentData) {
    const { system, prototypeToken } = document;
    const { source, attributes } = system;
    const { movement, senses } = attributes;
    
    const updateMapping = (field, condition, path, converter) => {
      if (!mapping[field] && condition) {
        mapping[field] = { path, converter };
      }
    };
    
    if (!mapping.tokenName && documentData.name !== documentData.tokenName) mapping.tokenName = "prototypeToken.name";
    
    updateMapping('sources', source?.book || source?.custom, 'system.source', 'source');
    updateMapping('token', prototypeToken?.sight?.range, 'prototypeToken.sight.range', 'sightRange');

    const movementCondition = movement && ["ft", "mi"].includes(movement.units) &&
      (movement.burrow || movement.climb || movement.swim || movement.walk || movement.fly);
    updateMapping('movement', movementCondition, 'system.attributes.movement', 'movement');

    const sensesCondition = senses && ["ft", "mi"].includes(senses.units) &&
      (senses.darkvision || senses.blindsight || senses.tremorsense || senses.truesight);
    updateMapping('senses', sensesCondition, 'system.attributes.senses', 'senses');

    updateMapping('items', documentData.items, 'items', 'items');
    updateMapping('effects', documentData.effects, 'effects', 'effects');
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const document = await this.pack.getDocument(indexDocument._id);
      const documentData = ActorExporter.getDocumentData(document, this.options.customMapping, true);

      ActorExporter.addBaseMapping(this.dataset.mapping, document, documentData);

      let key = this.options.useIdAsKey ? document._id : document.name;
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? document._id : key;
      
      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      this._stepProgressBar();
    }
  }
}
