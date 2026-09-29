export class NewsContentProvider {
  async createTranslations() {
    throw new Error('NewsContentProvider.createTranslations must be implemented');
  }
}

export class ManualReviewContentProvider extends NewsContentProvider {
  async createTranslations() {
    return null;
  }
}

export const defaultContentProvider = new ManualReviewContentProvider();
