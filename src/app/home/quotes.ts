import { dayOfYear } from './background';

export interface Quote {
  text: string;
  author: string;
}

/**
 * Short quotes, one per day: classical texts in their public-domain translations (Legge, Long, Gummere, Ross) and
 * writers whose work entered the public domain long ago. Popular misattributions are left out. Bundled: no network,
 * no permission, works offline.
 */
export const QUOTES: readonly Quote[] = [
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: 'He who knows other men is discerning; he who knows himself is intelligent.', author: 'Lao Tzu' },
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'Lost time is never found again.', author: 'Benjamin Franklin' },
  { text: 'Little strokes fell great oaks.', author: 'Benjamin Franklin' },
  { text: 'Diligence is the mother of good luck.', author: 'Benjamin Franklin' },
  { text: 'The superior man is modest in his speech, but exceeds in his actions.', author: 'Confucius' },
  {
    text: 'When you know a thing, to hold that you know it; and when you do not know a thing, to allow that you do not know it; this is knowledge.',
    author: 'Confucius',
  },
  { text: 'Adopt the pace of nature: her secret is patience.', author: 'Ralph Waldo Emerson' },
  { text: 'Write it on your heart that every day is the best day in the year.', author: 'Ralph Waldo Emerson' },
  { text: 'The years teach much which the days never know.', author: 'Ralph Waldo Emerson' },
  { text: 'Our life is frittered away by detail. Simplify, simplify.', author: 'Henry David Thoreau' },
  {
    text: 'It is not enough to be industrious; so are the ants. What are you industrious about?',
    author: 'Henry David Thoreau',
  },
  { text: 'Heaven is under our feet as well as over our heads.', author: 'Henry David Thoreau' },
  { text: 'We need the tonic of wildness.', author: 'Henry David Thoreau' },
  { text: 'The best time to plant a tree was twenty years ago. The second best time is now.', author: 'Proverb' },
  { text: 'Very little indeed is necessary for living a happy life.', author: 'Marcus Aurelius' },
  {
    text: 'No longer talk at all about the kind of man that a good man ought to be, but be such.',
    author: 'Marcus Aurelius',
  },
  {
    text: 'Look within. Within is the fountain of good, and it will ever bubble up, if thou wilt ever dig.',
    author: 'Marcus Aurelius',
  },
  { text: 'While we are postponing, life speeds by.', author: 'Seneca' },
  { text: 'Begin at once to live, and count each separate day as a separate life.', author: 'Seneca' },
  { text: 'It is not the man who has too little, but the man who craves more, that is poor.', author: 'Seneca' },
  { text: 'Hold every hour in your grasp.', author: 'Seneca' },
  {
    text: 'Men are disturbed not by the things which happen, but by the opinions about the things.',
    author: 'Epictetus',
  },
  { text: 'No great thing is created suddenly.', author: 'Epictetus' },
  {
    text: 'Knowing is not enough; we must apply. Willing is not enough; we must do.',
    author: 'Johann Wolfgang von Goethe',
  },
  { text: 'One swallow does not make a summer, nor does one day.', author: 'Aristotle' },
  { text: 'The unexamined life is not worth living.', author: 'Socrates' },
  { text: 'There is nothing either good or bad, but thinking makes it so.', author: 'William Shakespeare' },
  {
    text: 'Our doubts are traitors, and make us lose the good we oft might win, by fearing to attempt.',
    author: 'William Shakespeare',
  },
  { text: 'Come forth into the light of things, let Nature be your teacher.', author: 'William Wordsworth' },
  { text: 'In every walk with nature one receives far more than he seeks.', author: 'John Muir' },
  { text: 'The best is the enemy of the good.', author: 'Voltaire' },
  {
    text: 'All the unhappiness of men arises from one single fact, that they cannot stay quietly in their own chamber.',
    author: 'Blaise Pascal',
  },
  { text: 'Dripping water hollows out stone.', author: 'Ovid' },
  { text: 'A thing of beauty is a joy for ever.', author: 'John Keats' },
  { text: 'Hope is the thing with feathers that perches in the soul.', author: 'Emily Dickinson' },
  { text: 'I exist as I am, that is enough.', author: 'Walt Whitman' },
  { text: 'Rest is not idleness.', author: 'John Lubbock' },
  { text: 'Have you somewhat to do tomorrow, do it today.', author: 'Benjamin Franklin' },
];

export function quoteOfTheDay(date: Date): Quote {
  return QUOTES[dayOfYear(date) % QUOTES.length];
}
