import { dayOfYear } from './background';

export interface Quote {
  text: string;
  author: string;
}

/** Short public-domain quotes, one per day. Bundled: no network, no permission, works offline. */
export const QUOTES: readonly Quote[] = [
  { text: 'Nature does not hurry, yet everything is accomplished.', author: 'Lao Tzu' },
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'Lost time is never found again.', author: 'Benjamin Franklin' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Adopt the pace of nature: her secret is patience.', author: 'Ralph Waldo Emerson' },
  { text: 'Write it on your heart that every day is the best day in the year.', author: 'Ralph Waldo Emerson' },
  { text: 'Our life is frittered away by detail. Simplify, simplify.', author: 'Henry David Thoreau' },
  { text: 'It is not enough to be busy. The question is: what are we busy about?', author: 'Henry David Thoreau' },
  { text: 'Wherever you go, go with all your heart.', author: 'Confucius' },
  { text: 'The best time to plant a tree was twenty years ago. The second best time is now.', author: 'Proverb' },
  {
    text: 'You have power over your mind, not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
  },
  { text: 'Very little is needed to make a happy life.', author: 'Marcus Aurelius' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'While we wait for life, life passes.', author: 'Seneca' },
  { text: 'Begin at once to live.', author: 'Seneca' },
  { text: 'Knowing is not enough; we must apply.', author: 'Johann Wolfgang von Goethe' },
  { text: 'Whatever you can do, or dream you can, begin it.', author: 'Johann Wolfgang von Goethe' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'Life is like riding a bicycle. To keep your balance you must keep moving.', author: 'Albert Einstein' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Kindness is the language which the deaf can hear and the blind can see.', author: 'Mark Twain' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Nothing is particularly hard if you divide it into small jobs.', author: 'Henry Ford' },
  { text: 'It always seems impossible until it is done.', author: 'Proverb' },
  { text: 'Little by little, one travels far.', author: 'J. R. R. Tolkien' },
  { text: 'Not all those who wander are lost.', author: 'J. R. R. Tolkien' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'Happiness depends upon ourselves.', author: 'Aristotle' },
  { text: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
  { text: 'The unexamined life is not worth living.', author: 'Socrates' },
  { text: 'He who has a why to live can bear almost any how.', author: 'Friedrich Nietzsche' },
  {
    text: 'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.',
    author: 'Ralph Waldo Emerson',
  },
  { text: 'The mind is everything. What you think you become.', author: 'Proverb' },
  { text: 'Rest is not idleness.', author: 'John Lubbock' },
  { text: 'An unhurried sense of time is in itself a form of wealth.', author: 'Bonnie Friedman' },
  { text: 'Slow down and everything you are chasing will come around and catch you.', author: 'John De Paola' },
  { text: 'Each morning we are born again. What we do today is what matters most.', author: 'Proverb' },
];

export function quoteOfTheDay(date: Date): Quote {
  return QUOTES[dayOfYear(date) % QUOTES.length];
}
