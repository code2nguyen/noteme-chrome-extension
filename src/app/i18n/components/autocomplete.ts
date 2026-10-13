import type { TranslatedMessages } from '@c2n/core/localize.js';

/** c2-autocomplete's text in French and Vietnamese: the components ship English only. */
export const fr: TranslatedMessages = {
  loading: 'Chargement des suggestions…',
  loadError: 'Impossible de charger les suggestions.',
  empty: 'Aucune suggestion trouvée.',
  clear: 'Effacer',
  suggestions: 'Suggestions',
  suggestionsFor: (label) => `Suggestions pour ${label}`,
  valueMissing: 'Veuillez renseigner ce champ.',
};

export const vi: TranslatedMessages = {
  loading: 'Đang tải gợi ý…',
  loadError: 'Không thể tải gợi ý.',
  empty: 'Không tìm thấy gợi ý nào.',
  clear: 'Xóa',
  suggestions: 'Gợi ý',
  suggestionsFor: (label) => `Gợi ý cho ${label}`,
  valueMissing: 'Vui lòng điền vào trường này.',
};
