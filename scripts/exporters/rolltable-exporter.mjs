import { AbstractExporter } from './abstract-exporter.mjs';
import { deepEqual } from '../helpers/compare.mjs';

export class RollTableExporter extends AbstractExporter {
  static getDocumentData(document) {
    const { name, description } = document;
    const documentData = { name, ...(description && { description }) };

    if (AbstractExporter._hasContent(document.results)) {
      documentData.results = Object.fromEntries(
        document.results.map(({ range, text }) => [`${range[0]}-${range[1]}`, text])
      );
    }

    return documentData;
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const documentData = RollTableExporter.getDocumentData(await this.pack.getDocument(indexDocument._id));

      let key = this.options.useIdAsKey ? indexDocument._id : indexDocument.name;
      key = this.dataset.entries[key] && !deepEqual(this.dataset.entries[key], documentData) ? indexDocument._id : key;
      
      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      this._stepProgressBar();
    }
  }
}
