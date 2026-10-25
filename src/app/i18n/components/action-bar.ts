import type { TranslatedMessages } from '@c2n/core/localize.js';

/** c2-action-bar's text in French and Vietnamese: the components ship English only. */
export const fr: TranslatedMessages = {
  selected: (count: number) => (count > 1 ? `${count} sélectionnés` : `${count} sélectionné`),
  clear: 'Effacer la sélection',
  actions: 'Actions sur la sélection',
};

export const vi: TranslatedMessages = {
  selected: (count: number) => `Đã chọn ${count}`,
  clear: 'Bỏ chọn tất cả',
  actions: 'Thao tác với mục đã chọn',
};
