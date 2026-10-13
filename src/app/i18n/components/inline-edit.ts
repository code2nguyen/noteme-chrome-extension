import type { TranslatedMessages } from '@c2n/core/localize.js';

/** c2-inline-edit's text in French and Vietnamese: the components ship English only. */
export const fr: TranslatedMessages = {
  display: (label, text) => `${label}\u202f: ${text}`,
  save: 'Enregistrer',
  cancel: 'Annuler',
  valueMissing: 'Veuillez renseigner ce champ.',
};

export const vi: TranslatedMessages = {
  display: (label, text) => `${label}: ${text}`,
  save: 'Lưu',
  cancel: 'Hủy',
  valueMissing: 'Vui lòng điền vào trường này.',
};
