import { AbstractExporter } from './abstract-exporter.mjs';

export class PlaylistExporter extends AbstractExporter {
  static getDocumentData(document) {
    const { name, description } = document;
    const documentData = { name, ...(description && { description }) };

    if (this._hasContent(document.sounds)) {
      documentData.sounds = Object.fromEntries(
        document.sounds.map(sound => [sound.name, sound])
      );
    }

    return documentData;
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const documentData = PlaylistExporter.getDocumentData(await this.pack.getDocument(indexDocument._id));

      let key = this.options.useIdAsKey ? indexDocument._id : indexDocument.name;
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? indexDocument._id : key;

      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      this._stepProgressBar();
    }
  }
}
