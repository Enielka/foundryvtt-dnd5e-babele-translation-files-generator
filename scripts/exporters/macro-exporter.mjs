import { AbstractExporter } from './abstract-exporter.mjs';

export class MacroExporter extends AbstractExporter {
  static getDocumentData(document) {
    const { name, command } = document;

    return { name, command };
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const documentData = MacroExporter.getDocumentData(indexDocument);

      let key = this.options.useIdAsKey ? indexDocument._id : indexDocument.name;
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? indexDocument._id : key;
      
      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      this._stepProgressBar();
    }
  }
}
