import { dayOfYear } from './background';

export interface Quote {
  text: string;
  author: string;
}

/**
 * Short quotes, one per day: classical texts in their public-domain translations (Legge, Long, Gummere, Ross, Jowett,
 * Müller, Burnet, Florio, Elwes) and writers whose work entered the public domain long ago. Popular misattributions are
 * left out. Bundled: no network, no permission, works offline.
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
  { text: 'Remember that all is opinion.', author: 'Marcus Aurelius' },
  { text: 'The universe is transformation; life is opinion.', author: 'Marcus Aurelius' },
  { text: 'Do not act as if thou wert going to live ten thousand years.', author: 'Marcus Aurelius' },
  { text: 'The best way of avenging thyself is not to become like the wrong doer.', author: 'Marcus Aurelius' },
  {
    text: "Take away thy opinion, and then there is taken away the complaint, 'I have been harmed.'",
    author: 'Marcus Aurelius',
  },
  {
    text: 'If thou art pained by any external thing, it is not this thing that disturbs thee, but thy own judgement about it.',
    author: 'Marcus Aurelius',
  },
  {
    text: 'Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts.',
    author: 'Marcus Aurelius',
  },
  { text: 'Nothing, Lucilius, is ours, except time.', author: 'Seneca' },
  { text: 'Everywhere means nowhere.', author: 'Seneca' },
  { text: 'Men learn while they teach.', author: 'Seneca' },
  { text: 'No good thing is pleasant to possess, without friends to share it.', author: 'Seneca' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
  { text: 'You need a change of soul rather than a change of climate.', author: 'Seneca' },
  { text: 'When a man does not know what harbour he is making for, no wind is the right wind.', author: 'Seneca' },
  { text: 'Of things some are in our power, and others are not.', author: 'Epictetus' },
  {
    text: 'Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.',
    author: 'Epictetus',
  },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', author: 'Epictetus' },
  { text: 'If you would be a good reader, read; if a writer, write.', author: 'Epictetus' },
  { text: 'Is it not pleasant to learn with a constant perseverance and application?', author: 'Confucius' },
  { text: 'Learning without thought is labour lost; thought without learning is perilous.', author: 'Confucius' },
  {
    text: 'When we see men of worth, we should think of equalling them; when we see men of a contrary character, we should turn inwards and examine ourselves.',
    author: 'Confucius',
  },
  { text: 'Virtue is not left to stand alone. He who practises it will have neighbours.', author: 'Confucius' },
  { text: 'What you do not want done to yourself, do not do to others.', author: 'Confucius' },
  { text: 'When I walk along with two others, they may serve me as my teachers.', author: 'Confucius' },
  { text: 'To see what is right and not to do it is want of courage.', author: 'Confucius' },
  {
    text: 'When the year becomes cold, then we know how the pine and the cypress are the last to lose their leaves.',
    author: 'Confucius',
  },
  { text: 'He who overcomes others is strong; he who overcomes himself is mighty.', author: 'Lao Tzu' },
  {
    text: 'All difficult things in the world are sure to arise from a previous state in which they were easy, and all great things from one in which they were small.',
    author: 'Lao Tzu',
  },
  {
    text: 'All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts.',
    author: 'The Dhammapada',
  },
  {
    text: 'You cannot step twice into the same rivers; for fresh waters are ever flowing in upon you.',
    author: 'Heraclitus',
  },
  { text: 'The beginning is the most important part of any work.', author: 'Plato' },
  { text: 'Man is by nature a political animal.', author: 'Aristotle' },
  { text: 'Life is short, and Art long.', author: 'Hippocrates' },
  { text: 'Fortune favours the bold.', author: 'Virgil' },
  { text: 'They can because they think they can.', author: 'Virgil' },
  { text: 'Seize the day, trusting as little as possible in tomorrow.', author: 'Horace' },
  { text: 'He who has begun has half done. Dare to be wise; begin!', author: 'Horace' },
  { text: 'Practice is the best of all instructors.', author: 'Publilius Syrus' },
  { text: 'You should pray for a sound mind in a sound body.', author: 'Juvenal' },
  { text: 'Slow but steady wins the race.', author: 'Aesop' },
  { text: 'Fall seven times, stand up eight.', author: 'Proverb' },
  { text: 'Early to bed and early to rise, makes a man healthy, wealthy, and wise.', author: 'Benjamin Franklin' },
  { text: 'Haste makes waste.', author: 'Benjamin Franklin' },
  { text: 'A penny saved is two pence clear.', author: 'Benjamin Franklin' },
  {
    text: "Dost thou love life? Then do not squander time, for that's the stuff life is made of.",
    author: 'Benjamin Franklin',
  },
  {
    text: "Hide not your talents, they for use were made. What's a sun-dial in the shade?",
    author: 'Benjamin Franklin',
  },
  { text: 'Nothing great was ever achieved without enthusiasm.', author: 'Ralph Waldo Emerson' },
  { text: 'To be great is to be misunderstood.', author: 'Ralph Waldo Emerson' },
  { text: 'The only way to have a friend is to be one.', author: 'Ralph Waldo Emerson' },
  { text: 'Trust thyself: every heart vibrates to that iron string.', author: 'Ralph Waldo Emerson' },
  { text: 'Nothing can bring you peace but yourself.', author: 'Ralph Waldo Emerson' },
  { text: 'Earth laughs in flowers.', author: 'Ralph Waldo Emerson' },
  { text: 'Finish each day and be done with it.', author: 'Ralph Waldo Emerson' },
  {
    text: 'If one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.',
    author: 'Henry David Thoreau',
  },
  { text: 'I went to the woods because I wished to live deliberately.', author: 'Henry David Thoreau' },
  { text: 'The mass of men lead lives of quiet desperation.', author: 'Henry David Thoreau' },
  { text: 'Rather than love, than money, than fame, give me truth.', author: 'Henry David Thoreau' },
  {
    text: 'A man is rich in proportion to the number of things which he can afford to let alone.',
    author: 'Henry David Thoreau',
  },
  { text: 'Time is but the stream I go a-fishing in.', author: 'Henry David Thoreau' },
  {
    text: 'If you have built castles in the air, your work need not be lost; that is where they should be. Now put the foundations under them.',
    author: 'Henry David Thoreau',
  },
  {
    text: 'Every morning was a cheerful invitation to make my life of equal simplicity, and I may say innocence, with Nature herself.',
    author: 'Henry David Thoreau',
  },
  { text: 'This above all: to thine own self be true.', author: 'William Shakespeare' },
  { text: 'We know what we are, but know not what we may be.', author: 'William Shakespeare' },
  {
    text: 'The fault, dear Brutus, is not in our stars, but in ourselves.',
    author: 'William Shakespeare',
  },
  {
    text: 'How far that little candle throws his beams! So shines a good deed in a naughty world.',
    author: 'William Shakespeare',
  },
  { text: 'Love all, trust a few, do wrong to none.', author: 'William Shakespeare' },
  { text: 'Wisely and slow; they stumble that run fast.', author: 'William Shakespeare' },
  { text: 'Brevity is the soul of wit.', author: 'William Shakespeare' },
  {
    text: "All the world's a stage, and all the men and women merely players.",
    author: 'William Shakespeare',
  },
  { text: "Things won are done; joy's soul lies in the doing.", author: 'William Shakespeare' },
  { text: 'Nothing is worth more than this day.', author: 'Johann Wolfgang von Goethe' },
  { text: 'Knowledge itself is power.', author: 'Francis Bacon' },
  {
    text: 'Reading maketh a full man; conference a ready man; and writing an exact man.',
    author: 'Francis Bacon',
  },
  { text: 'No man is an island, entire of itself.', author: 'John Donne' },
  {
    text: "The mind is its own place, and in itself can make a Heav'n of Hell, a Hell of Heav'n.",
    author: 'John Milton',
  },
  {
    text: 'If I have seen further it is by standing on the shoulders of Giants.',
    author: 'Isaac Newton',
  },
  { text: 'All things excellent are as difficult as they are rare.', author: 'Baruch Spinoza' },
  {
    text: 'The greatest thing of the world is for a man to know how to be his own.',
    author: 'Michel de Montaigne',
  },
  { text: 'The heart has its reasons which reason knows nothing of.', author: 'Blaise Pascal' },
  {
    text: 'I have made this longer than usual because I have not had time to make it shorter.',
    author: 'Blaise Pascal',
  },
  { text: 'We must cultivate our garden.', author: 'Voltaire' },
  { text: 'Vision is the art of seeing things invisible.', author: 'Jonathan Swift' },
  { text: 'To err is human, to forgive divine.', author: 'Alexander Pope' },
  { text: 'Hope springs eternal in the human breast.', author: 'Alexander Pope' },
  { text: "A little learning is a dang'rous thing.", author: 'Alexander Pope' },
  { text: 'Few things are impossible to diligence and skill.', author: 'Samuel Johnson' },
  {
    text: 'What we hope ever to do with ease, we must learn first to do with diligence.',
    author: 'Samuel Johnson',
  },
  { text: "The best laid schemes o' mice an' men gang aft agley.", author: 'Robert Burns' },
  {
    text: 'To see a World in a Grain of Sand, and a Heaven in a Wild Flower.',
    author: 'William Blake',
  },
  { text: 'Great things are done when men and mountains meet.', author: 'William Blake' },
  { text: 'The Child is father of the Man.', author: 'William Wordsworth' },
  { text: 'If Winter comes, can Spring be far behind?', author: 'Percy Bysshe Shelley' },
  { text: 'Beauty is truth, truth beauty.', author: 'John Keats' },
  { text: 'To strive, to seek, to find, and not to yield.', author: 'Alfred Tennyson' },
  { text: "'Tis better to have loved and lost than never to have loved at all.", author: 'Alfred Tennyson' },
  { text: 'Into each life some rain must fall.', author: 'Henry Wadsworth Longfellow' },
  {
    text: 'Lives of great men all remind us we can make our lives sublime.',
    author: 'Henry Wadsworth Longfellow',
  },
  {
    text: "Ah, but a man's reach should exceed his grasp, or what's a heaven for?",
    author: 'Robert Browning',
  },
  { text: 'Grow old along with me! The best is yet to be.', author: 'Robert Browning' },
  { text: 'I am large, I contain multitudes.', author: 'Walt Whitman' },
  { text: 'Forever is composed of nows.', author: 'Emily Dickinson' },
  { text: 'That it will never come again is what makes life so sweet.', author: 'Emily Dickinson' },
  {
    text: 'What do we live for, if it is not to make life less difficult to each other?',
    author: 'George Eliot',
  },
  {
    text: 'Blessed is he who has found his work; let him ask no other blessedness.',
    author: 'Thomas Carlyle',
  },
  { text: 'There is no wealth but life.', author: 'John Ruskin' },
  { text: 'He who never made a mistake never made a discovery.', author: 'Samuel Smiles' },
  {
    text: 'In the fields of observation chance favours only the prepared mind.',
    author: 'Louis Pasteur',
  },
  { text: 'To travel hopefully is a better thing than to arrive.', author: 'Robert Louis Stevenson' },
  { text: 'The mountains are calling and I must go.', author: 'John Muir' },
  {
    text: 'Courage is resistance to fear, mastery of fear, not absence of fear.',
    author: 'Mark Twain',
  },
  {
    text: 'Always do right. This will gratify some people and astonish the rest.',
    author: 'Mark Twain',
  },
  { text: 'Experience is the name every one gives to their mistakes.', author: 'Oscar Wilde' },
  { text: 'We are all in the gutter, but some of us are looking at the stars.', author: 'Oscar Wilde' },
  {
    text: 'Laugh, and the world laughs with you; weep, and you weep alone.',
    author: 'Ella Wheeler Wilcox',
  },
  {
    text: 'If you can keep your head when all about you are losing theirs and blaming it on you.',
    author: 'Rudyard Kipling',
  },
  {
    text: 'Genius is one per cent inspiration and ninety-nine per cent perspiration.',
    author: 'Thomas Edison',
  },
];

export function quoteOfTheDay(date: Date): Quote {
  return QUOTES[dayOfYear(date) % QUOTES.length];
}
