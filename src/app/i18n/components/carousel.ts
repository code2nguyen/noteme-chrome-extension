import type { TranslatedMessages } from '@c2n/core/localize.js';

/** c2-carousel's text in French and Vietnamese: the components ship English only. */
export const fr: TranslatedMessages = {
  label: 'Carrousel',
  carousel: 'carrousel',
  slide: 'diapositive',
  previous: 'Diapositive précédente',
  next: 'Diapositive suivante',
  indicators: 'Choisir une diapositive',
  goTo: (index) => `Aller à la diapositive ${index}`,
  slideLabel: (index, count) => `${index} sur ${count}`,
  play: 'Lancer le défilement automatique',
  pause: 'Arrêter le défilement automatique',
};

export const vi: TranslatedMessages = {
  label: 'Trình chiếu',
  carousel: 'trình chiếu',
  slide: 'trang chiếu',
  previous: 'Trang chiếu trước',
  next: 'Trang chiếu tiếp theo',
  indicators: 'Chọn trang chiếu',
  goTo: (index) => `Đến trang chiếu ${index}`,
  slideLabel: (index, count) => `${index} trên ${count}`,
  play: 'Bắt đầu tự động chuyển trang',
  pause: 'Dừng tự động chuyển trang',
};
