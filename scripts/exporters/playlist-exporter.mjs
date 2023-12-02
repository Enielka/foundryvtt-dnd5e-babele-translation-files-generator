import { AbstractExporter } from './abstract-exporter.mjs';

export class PlaylistExporter extends AbstractExporter {
  static getDocumentData(indexDocument, document) {
    const { name, description } = indexDocument;
    const documentData = { name, description };

    if (AbstractExporter._hasContent(document.sounds)) {
      documentData.sounds = {};

      for (const { name, description } of document.sounds) {
        documentData.sounds[name] = { name, description };
      }
    }

    return documentData;
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      this.dataset.entries[indexDocument.name] = foundry.utils.mergeObject(
        PlaylistExporter.getDocumentData(
          indexDocument,
          await this.pack.getDocument(indexDocument._id),
        ),
        this.existingContent[indexDocument.name] ?? {},
      );

      this._stepProgressBar();
    }
  }
}
