export const QUOTE_THEMES = [
  'action',
  'character',
  'courage',
  'hope',
  'kindness',
  'learning',
  'mind',
  'nature',
  'perseverance',
  'simplicity',
  'time',
] as const;

export type QuoteTheme = (typeof QUOTE_THEMES)[number];

export interface Quote {
  text: string;
  author: string;
  /** The one thing a quote is about; no two days in a row share it. */
  theme: QuoteTheme;
  /** Finer topics, lower case and hyphenated; no two days in a row share one either, when the list allows. */
  tags: readonly string[];
}

/**
 * Short quotes, one per day: classical texts in their public-domain translations (Legge, Long, Gummere, Ross, Jowett,
 * Müller, Burnet, Florio, Elwes) and writers whose work entered the public domain long ago. Popular misattributions are
 * left out. Bundled: no network, no permission, works offline.
 */
export const QUOTES: readonly Quote[] = [
  // action
  {
    text: 'The journey of a thousand miles begins with one step.',
    author: 'Lao Tzu',
    theme: 'action',
    tags: ['beginning', 'small-steps'],
  },
  {
    text: 'Well done is better than well said.',
    author: 'Benjamin Franklin',
    theme: 'action',
    tags: ['deeds', 'words'],
  },
  {
    text: 'The superior man is modest in his speech, but exceeds in his actions.',
    author: 'Confucius',
    theme: 'action',
    tags: ['deeds', 'words', 'modesty'],
  },
  {
    text: 'It is not enough to be industrious; so are the ants. What are you industrious about?',
    author: 'Henry David Thoreau',
    theme: 'action',
    tags: ['purpose', 'work'],
  },
  {
    text: 'Knowing is not enough; we must apply. Willing is not enough; we must do.',
    author: 'Johann Wolfgang von Goethe',
    theme: 'action',
    tags: ['knowledge', 'will'],
  },
  {
    text: 'Have you somewhat to do tomorrow, do it today.',
    author: 'Benjamin Franklin',
    theme: 'action',
    tags: ['procrastination', 'today'],
  },
  {
    text: 'When a man does not know what harbour he is making for, no wind is the right wind.',
    author: 'Seneca',
    theme: 'action',
    tags: ['purpose', 'direction'],
  },
  {
    text: 'First say to yourself what you would be; and then do what you have to do.',
    author: 'Epictetus',
    theme: 'action',
    tags: ['purpose'],
  },
  {
    text: 'The beginning is the most important part of any work.',
    author: 'Plato',
    theme: 'action',
    tags: ['beginning'],
  },
  {
    text: 'He who has begun has half done. Dare to be wise; begin!',
    author: 'Horace',
    theme: 'action',
    tags: ['beginning', 'wisdom'],
  },
  {
    text: "Hide not your talents, they for use were made. What's a sun-dial in the shade?",
    author: 'Benjamin Franklin',
    theme: 'action',
    tags: ['talent', 'work'],
  },
  {
    text: "Things won are done; joy's soul lies in the doing.",
    author: 'William Shakespeare',
    theme: 'action',
    tags: ['joy', 'work'],
  },
  { text: 'We must cultivate our garden.', author: 'Voltaire', theme: 'action', tags: ['work', 'garden'] },
  {
    text: 'Blessed is he who has found his work; let him ask no other blessedness.',
    author: 'Thomas Carlyle',
    theme: 'action',
    tags: ['work', 'purpose'],
  },
  // character
  {
    text: 'He who knows other men is discerning; he who knows himself is intelligent.',
    author: 'Lao Tzu',
    theme: 'character',
    tags: ['self-knowledge'],
  },
  {
    text: 'No longer talk at all about the kind of man that a good man ought to be, but be such.',
    author: 'Marcus Aurelius',
    theme: 'character',
    tags: ['virtue', 'deeds'],
  },
  {
    text: 'Look within. Within is the fountain of good, and it will ever bubble up, if thou wilt ever dig.',
    author: 'Marcus Aurelius',
    theme: 'character',
    tags: ['virtue', 'self-knowledge'],
  },
  {
    text: 'You need a change of soul rather than a change of climate.',
    author: 'Seneca',
    theme: 'character',
    tags: ['change', 'self-knowledge'],
  },
  {
    text: 'No man is free who is not master of himself.',
    author: 'Epictetus',
    theme: 'character',
    tags: ['freedom', 'self-mastery'],
  },
  {
    text: 'When we see men of worth, we should think of equalling them; when we see men of a contrary character, we should turn inwards and examine ourselves.',
    author: 'Confucius',
    theme: 'character',
    tags: ['example', 'reflection'],
  },
  {
    text: 'He who overcomes others is strong; he who overcomes himself is mighty.',
    author: 'Lao Tzu',
    theme: 'character',
    tags: ['self-mastery', 'strength'],
  },
  {
    text: 'Trust thyself: every heart vibrates to that iron string.',
    author: 'Ralph Waldo Emerson',
    theme: 'character',
    tags: ['self-trust'],
  },
  {
    text: 'The mass of men lead lives of quiet desperation.',
    author: 'Henry David Thoreau',
    theme: 'character',
    tags: ['life', 'desperation'],
  },
  {
    text: 'Rather than love, than money, than fame, give me truth.',
    author: 'Henry David Thoreau',
    theme: 'character',
    tags: ['truth'],
  },
  {
    text: 'This above all: to thine own self be true.',
    author: 'William Shakespeare',
    theme: 'character',
    tags: ['authenticity'],
  },
  {
    text: "All the world's a stage, and all the men and women merely players.",
    author: 'William Shakespeare',
    theme: 'character',
    tags: ['life', 'roles'],
  },
  {
    text: 'The greatest thing of the world is for a man to know how to be his own.',
    author: 'Michel de Montaigne',
    theme: 'character',
    tags: ['self-possession'],
  },
  {
    text: 'The Child is father of the Man.',
    author: 'William Wordsworth',
    theme: 'character',
    tags: ['childhood', 'growth'],
  },
  {
    text: 'I am large, I contain multitudes.',
    author: 'Walt Whitman',
    theme: 'character',
    tags: ['self', 'complexity'],
  },
  // courage
  {
    text: 'Our doubts are traitors, and make us lose the good we oft might win, by fearing to attempt.',
    author: 'William Shakespeare',
    theme: 'courage',
    tags: ['doubt', 'fear'],
  },
  {
    text: 'To see what is right and not to do it is want of courage.',
    author: 'Confucius',
    theme: 'courage',
    tags: ['integrity'],
  },
  { text: 'Fortune favours the bold.', author: 'Virgil', theme: 'courage', tags: ['boldness', 'fortune'] },
  {
    text: 'To be great is to be misunderstood.',
    author: 'Ralph Waldo Emerson',
    theme: 'courage',
    tags: ['greatness', 'misunderstood'],
  },
  {
    text: 'The fault, dear Brutus, is not in our stars, but in ourselves.',
    author: 'William Shakespeare',
    theme: 'courage',
    tags: ['responsibility'],
  },
  {
    text: "The best laid schemes o' mice an' men gang aft agley.",
    author: 'Robert Burns',
    theme: 'courage',
    tags: ['plans', 'setbacks'],
  },
  {
    text: "Ah, but a man's reach should exceed his grasp, or what's a heaven for?",
    author: 'Robert Browning',
    theme: 'courage',
    tags: ['ambition', 'striving'],
  },
  {
    text: 'He who never made a mistake never made a discovery.',
    author: 'Samuel Smiles',
    theme: 'courage',
    tags: ['mistakes', 'discovery'],
  },
  {
    text: 'Courage is resistance to fear, mastery of fear, not absence of fear.',
    author: 'Mark Twain',
    theme: 'courage',
    tags: ['fear'],
  },
  {
    text: 'Always do right. This will gratify some people and astonish the rest.',
    author: 'Mark Twain',
    theme: 'courage',
    tags: ['integrity', 'humor'],
  },
  {
    text: 'If you can keep your head when all about you are losing theirs and blaming it on you.',
    author: 'Rudyard Kipling',
    theme: 'courage',
    tags: ['composure', 'adversity'],
  },
  // hope
  { text: 'A thing of beauty is a joy for ever.', author: 'John Keats', theme: 'hope', tags: ['beauty', 'joy'] },
  {
    text: 'Hope is the thing with feathers that perches in the soul.',
    author: 'Emily Dickinson',
    theme: 'hope',
    tags: ['soul'],
  },
  { text: 'They can because they think they can.', author: 'Virgil', theme: 'hope', tags: ['belief', 'confidence'] },
  {
    text: 'Nothing great was ever achieved without enthusiasm.',
    author: 'Ralph Waldo Emerson',
    theme: 'hope',
    tags: ['enthusiasm', 'greatness'],
  },
  {
    text: 'If one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.',
    author: 'Henry David Thoreau',
    theme: 'hope',
    tags: ['dreams', 'success'],
  },
  {
    text: 'If you have built castles in the air, your work need not be lost; that is where they should be. Now put the foundations under them.',
    author: 'Henry David Thoreau',
    theme: 'hope',
    tags: ['dreams', 'work'],
  },
  {
    text: 'We know what we are, but know not what we may be.',
    author: 'William Shakespeare',
    theme: 'hope',
    tags: ['potential'],
  },
  {
    text: 'Vision is the art of seeing things invisible.',
    author: 'Jonathan Swift',
    theme: 'hope',
    tags: ['vision', 'imagination'],
  },
  { text: 'Hope springs eternal in the human breast.', author: 'Alexander Pope', theme: 'hope', tags: ['hope'] },
  {
    text: 'If Winter comes, can Spring be far behind?',
    author: 'Percy Bysshe Shelley',
    theme: 'hope',
    tags: ['seasons', 'change'],
  },
  {
    text: 'Lives of great men all remind us we can make our lives sublime.',
    author: 'Henry Wadsworth Longfellow',
    theme: 'hope',
    tags: ['greatness', 'example'],
  },
  {
    text: 'Grow old along with me! The best is yet to be.',
    author: 'Robert Browning',
    theme: 'hope',
    tags: ['aging', 'future'],
  },
  {
    text: 'That it will never come again is what makes life so sweet.',
    author: 'Emily Dickinson',
    theme: 'hope',
    tags: ['life', 'transience'],
  },
  {
    text: 'To travel hopefully is a better thing than to arrive.',
    author: 'Robert Louis Stevenson',
    theme: 'hope',
    tags: ['journey'],
  },
  {
    text: 'We are all in the gutter, but some of us are looking at the stars.',
    author: 'Oscar Wilde',
    theme: 'hope',
    tags: ['stars', 'adversity'],
  },
  // kindness
  {
    text: 'The best way of avenging thyself is not to become like the wrong doer.',
    author: 'Marcus Aurelius',
    theme: 'kindness',
    tags: ['forgiveness', 'virtue'],
  },
  {
    text: 'No good thing is pleasant to possess, without friends to share it.',
    author: 'Seneca',
    theme: 'kindness',
    tags: ['friendship', 'sharing'],
  },
  {
    text: 'Virtue is not left to stand alone. He who practises it will have neighbours.',
    author: 'Confucius',
    theme: 'kindness',
    tags: ['virtue', 'community'],
  },
  {
    text: 'What you do not want done to yourself, do not do to others.',
    author: 'Confucius',
    theme: 'kindness',
    tags: ['golden-rule'],
  },
  { text: 'Man is by nature a political animal.', author: 'Aristotle', theme: 'kindness', tags: ['community'] },
  {
    text: 'The only way to have a friend is to be one.',
    author: 'Ralph Waldo Emerson',
    theme: 'kindness',
    tags: ['friendship'],
  },
  {
    text: 'How far that little candle throws his beams! So shines a good deed in a naughty world.',
    author: 'William Shakespeare',
    theme: 'kindness',
    tags: ['goodness', 'light'],
  },
  {
    text: 'Love all, trust a few, do wrong to none.',
    author: 'William Shakespeare',
    theme: 'kindness',
    tags: ['trust', 'love'],
  },
  {
    text: 'No man is an island, entire of itself.',
    author: 'John Donne',
    theme: 'kindness',
    tags: ['community', 'connection'],
  },
  {
    text: 'The heart has its reasons which reason knows nothing of.',
    author: 'Blaise Pascal',
    theme: 'kindness',
    tags: ['love', 'heart'],
  },
  {
    text: 'To err is human, to forgive divine.',
    author: 'Alexander Pope',
    theme: 'kindness',
    tags: ['forgiveness', 'mistakes'],
  },
  {
    text: "'Tis better to have loved and lost than never to have loved at all.",
    author: 'Alfred Tennyson',
    theme: 'kindness',
    tags: ['love', 'loss'],
  },
  {
    text: 'What do we live for, if it is not to make life less difficult to each other?',
    author: 'George Eliot',
    theme: 'kindness',
    tags: ['compassion'],
  },
  {
    text: 'Laugh, and the world laughs with you; weep, and you weep alone.',
    author: 'Ella Wheeler Wilcox',
    theme: 'kindness',
    tags: ['joy', 'laughter'],
  },
  // learning
  {
    text: 'When you know a thing, to hold that you know it; and when you do not know a thing, to allow that you do not know it; this is knowledge.',
    author: 'Confucius',
    theme: 'learning',
    tags: ['knowledge', 'honesty'],
  },
  {
    text: 'The years teach much which the days never know.',
    author: 'Ralph Waldo Emerson',
    theme: 'learning',
    tags: ['experience'],
  },
  {
    text: 'The unexamined life is not worth living.',
    author: 'Socrates',
    theme: 'learning',
    tags: ['self-knowledge', 'reflection'],
  },
  { text: 'Men learn while they teach.', author: 'Seneca', theme: 'learning', tags: ['teaching'] },
  {
    text: 'If you would be a good reader, read; if a writer, write.',
    author: 'Epictetus',
    theme: 'learning',
    tags: ['reading', 'writing', 'practice'],
  },
  {
    text: 'Is it not pleasant to learn with a constant perseverance and application?',
    author: 'Confucius',
    theme: 'learning',
    tags: ['joy'],
  },
  {
    text: 'Learning without thought is labour lost; thought without learning is perilous.',
    author: 'Confucius',
    theme: 'learning',
    tags: ['thought'],
  },
  {
    text: 'When I walk along with two others, they may serve me as my teachers.',
    author: 'Confucius',
    theme: 'learning',
    tags: ['teachers', 'humility'],
  },
  {
    text: 'Practice is the best of all instructors.',
    author: 'Publilius Syrus',
    theme: 'learning',
    tags: ['practice'],
  },
  { text: 'Knowledge itself is power.', author: 'Francis Bacon', theme: 'learning', tags: ['knowledge', 'power'] },
  {
    text: 'Reading maketh a full man; conference a ready man; and writing an exact man.',
    author: 'Francis Bacon',
    theme: 'learning',
    tags: ['reading', 'writing', 'conversation'],
  },
  {
    text: 'If I have seen further it is by standing on the shoulders of Giants.',
    author: 'Isaac Newton',
    theme: 'learning',
    tags: ['humility', 'teachers'],
  },
  { text: "A little learning is a dang'rous thing.", author: 'Alexander Pope', theme: 'learning', tags: ['humility'] },
  {
    text: 'What we hope ever to do with ease, we must learn first to do with diligence.',
    author: 'Samuel Johnson',
    theme: 'learning',
    tags: ['diligence', 'practice'],
  },
  {
    text: 'In the fields of observation chance favours only the prepared mind.',
    author: 'Louis Pasteur',
    theme: 'learning',
    tags: ['preparation', 'chance'],
  },
  // mind
  {
    text: 'Men are disturbed not by the things which happen, but by the opinions about the things.',
    author: 'Epictetus',
    theme: 'mind',
    tags: ['stoic', 'perception'],
  },
  {
    text: 'There is nothing either good or bad, but thinking makes it so.',
    author: 'William Shakespeare',
    theme: 'mind',
    tags: ['perception'],
  },
  {
    text: 'All the unhappiness of men arises from one single fact, that they cannot stay quietly in their own chamber.',
    author: 'Blaise Pascal',
    theme: 'mind',
    tags: ['stillness', 'solitude'],
  },
  { text: 'I exist as I am, that is enough.', author: 'Walt Whitman', theme: 'mind', tags: ['self-acceptance'] },
  { text: 'Remember that all is opinion.', author: 'Marcus Aurelius', theme: 'mind', tags: ['stoic', 'perception'] },
  {
    text: "Take away thy opinion, and then there is taken away the complaint, 'I have been harmed.'",
    author: 'Marcus Aurelius',
    theme: 'mind',
    tags: ['stoic', 'resilience'],
  },
  {
    text: 'If thou art pained by any external thing, it is not this thing that disturbs thee, but thy own judgement about it.',
    author: 'Marcus Aurelius',
    theme: 'mind',
    tags: ['stoic', 'judgement'],
  },
  {
    text: 'Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts.',
    author: 'Marcus Aurelius',
    theme: 'mind',
    tags: ['habits', 'thoughts'],
  },
  {
    text: 'We suffer more often in imagination than in reality.',
    author: 'Seneca',
    theme: 'mind',
    tags: ['worry', 'fear'],
  },
  {
    text: 'Of things some are in our power, and others are not.',
    author: 'Epictetus',
    theme: 'mind',
    tags: ['stoic', 'control'],
  },
  {
    text: 'Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.',
    author: 'Epictetus',
    theme: 'mind',
    tags: ['stoic', 'acceptance', 'peace'],
  },
  {
    text: 'All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts.',
    author: 'The Dhammapada',
    theme: 'mind',
    tags: ['thoughts'],
  },
  { text: 'Nothing can bring you peace but yourself.', author: 'Ralph Waldo Emerson', theme: 'mind', tags: ['peace'] },
  {
    text: "The mind is its own place, and in itself can make a Heav'n of Hell, a Hell of Heav'n.",
    author: 'John Milton',
    theme: 'mind',
    tags: ['perception'],
  },
  {
    text: 'Experience is the name every one gives to their mistakes.',
    author: 'Oscar Wilde',
    theme: 'mind',
    tags: ['mistakes', 'experience'],
  },
  // nature
  {
    text: 'Adopt the pace of nature: her secret is patience.',
    author: 'Ralph Waldo Emerson',
    theme: 'nature',
    tags: ['patience'],
  },
  {
    text: 'Heaven is under our feet as well as over our heads.',
    author: 'Henry David Thoreau',
    theme: 'nature',
    tags: ['wonder'],
  },
  { text: 'We need the tonic of wildness.', author: 'Henry David Thoreau', theme: 'nature', tags: ['wildness'] },
  {
    text: 'Come forth into the light of things, let Nature be your teacher.',
    author: 'William Wordsworth',
    theme: 'nature',
    tags: ['teacher'],
  },
  {
    text: 'In every walk with nature one receives far more than he seeks.',
    author: 'John Muir',
    theme: 'nature',
    tags: ['walking'],
  },
  {
    text: 'The universe is transformation; life is opinion.',
    author: 'Marcus Aurelius',
    theme: 'nature',
    tags: ['change'],
  },
  {
    text: 'You cannot step twice into the same rivers; for fresh waters are ever flowing in upon you.',
    author: 'Heraclitus',
    theme: 'nature',
    tags: ['change'],
  },
  { text: 'Earth laughs in flowers.', author: 'Ralph Waldo Emerson', theme: 'nature', tags: ['flowers', 'joy'] },
  {
    text: 'Every morning was a cheerful invitation to make my life of equal simplicity, and I may say innocence, with Nature herself.',
    author: 'Henry David Thoreau',
    theme: 'nature',
    tags: ['morning', 'simplicity'],
  },
  {
    text: 'To see a World in a Grain of Sand, and a Heaven in a Wild Flower.',
    author: 'William Blake',
    theme: 'nature',
    tags: ['wonder'],
  },
  {
    text: 'Great things are done when men and mountains meet.',
    author: 'William Blake',
    theme: 'nature',
    tags: ['mountains', 'greatness'],
  },
  { text: 'Beauty is truth, truth beauty.', author: 'John Keats', theme: 'nature', tags: ['beauty', 'truth'] },
  {
    text: 'The mountains are calling and I must go.',
    author: 'John Muir',
    theme: 'nature',
    tags: ['mountains', 'adventure'],
  },
  // perseverance
  {
    text: 'Little strokes fell great oaks.',
    author: 'Benjamin Franklin',
    theme: 'perseverance',
    tags: ['small-steps'],
  },
  {
    text: 'Diligence is the mother of good luck.',
    author: 'Benjamin Franklin',
    theme: 'perseverance',
    tags: ['diligence', 'luck'],
  },
  {
    text: 'No great thing is created suddenly.',
    author: 'Epictetus',
    theme: 'perseverance',
    tags: ['patience', 'growth'],
  },
  {
    text: 'One swallow does not make a summer, nor does one day.',
    author: 'Aristotle',
    theme: 'perseverance',
    tags: ['habits', 'patience'],
  },
  { text: 'Dripping water hollows out stone.', author: 'Ovid', theme: 'perseverance', tags: ['patience'] },
  {
    text: 'When the year becomes cold, then we know how the pine and the cypress are the last to lose their leaves.',
    author: 'Confucius',
    theme: 'perseverance',
    tags: ['adversity', 'resilience'],
  },
  {
    text: 'All difficult things in the world are sure to arise from a previous state in which they were easy, and all great things from one in which they were small.',
    author: 'Lao Tzu',
    theme: 'perseverance',
    tags: ['small-steps', 'growth'],
  },
  { text: 'Slow but steady wins the race.', author: 'Aesop', theme: 'perseverance', tags: ['patience', 'steadiness'] },
  {
    text: 'Fall seven times, stand up eight.',
    author: 'Proverb',
    theme: 'perseverance',
    tags: ['resilience', 'failure'],
  },
  {
    text: 'Wisely and slow; they stumble that run fast.',
    author: 'William Shakespeare',
    theme: 'perseverance',
    tags: ['patience', 'haste'],
  },
  {
    text: 'All things excellent are as difficult as they are rare.',
    author: 'Baruch Spinoza',
    theme: 'perseverance',
    tags: ['excellence', 'difficulty'],
  },
  {
    text: 'Few things are impossible to diligence and skill.',
    author: 'Samuel Johnson',
    theme: 'perseverance',
    tags: ['diligence', 'skill'],
  },
  {
    text: 'To strive, to seek, to find, and not to yield.',
    author: 'Alfred Tennyson',
    theme: 'perseverance',
    tags: ['striving', 'will'],
  },
  {
    text: 'Into each life some rain must fall.',
    author: 'Henry Wadsworth Longfellow',
    theme: 'perseverance',
    tags: ['adversity'],
  },
  {
    text: 'Genius is one per cent inspiration and ninety-nine per cent perspiration.',
    author: 'Thomas Edison',
    theme: 'perseverance',
    tags: ['work', 'genius'],
  },
  // simplicity
  {
    text: 'Our life is frittered away by detail. Simplify, simplify.',
    author: 'Henry David Thoreau',
    theme: 'simplicity',
    tags: ['focus'],
  },
  {
    text: 'Very little indeed is necessary for living a happy life.',
    author: 'Marcus Aurelius',
    theme: 'simplicity',
    tags: ['happiness'],
  },
  {
    text: 'It is not the man who has too little, but the man who craves more, that is poor.',
    author: 'Seneca',
    theme: 'simplicity',
    tags: ['wealth', 'desire'],
  },
  { text: 'The best is the enemy of the good.', author: 'Voltaire', theme: 'simplicity', tags: ['perfectionism'] },
  { text: 'Rest is not idleness.', author: 'John Lubbock', theme: 'simplicity', tags: ['rest'] },
  { text: 'Everywhere means nowhere.', author: 'Seneca', theme: 'simplicity', tags: ['focus'] },
  {
    text: 'You should pray for a sound mind in a sound body.',
    author: 'Juvenal',
    theme: 'simplicity',
    tags: ['health', 'balance'],
  },
  {
    text: 'Early to bed and early to rise, makes a man healthy, wealthy, and wise.',
    author: 'Benjamin Franklin',
    theme: 'simplicity',
    tags: ['health', 'habits'],
  },
  { text: 'Haste makes waste.', author: 'Benjamin Franklin', theme: 'simplicity', tags: ['patience', 'haste'] },
  {
    text: 'A penny saved is two pence clear.',
    author: 'Benjamin Franklin',
    theme: 'simplicity',
    tags: ['wealth', 'thrift'],
  },
  {
    text: 'I went to the woods because I wished to live deliberately.',
    author: 'Henry David Thoreau',
    theme: 'simplicity',
    tags: ['deliberate', 'solitude'],
  },
  {
    text: 'A man is rich in proportion to the number of things which he can afford to let alone.',
    author: 'Henry David Thoreau',
    theme: 'simplicity',
    tags: ['wealth', 'letting-go'],
  },
  {
    text: 'Brevity is the soul of wit.',
    author: 'William Shakespeare',
    theme: 'simplicity',
    tags: ['brevity', 'writing'],
  },
  {
    text: 'I have made this longer than usual because I have not had time to make it shorter.',
    author: 'Blaise Pascal',
    theme: 'simplicity',
    tags: ['brevity', 'writing'],
  },
  { text: 'There is no wealth but life.', author: 'John Ruskin', theme: 'simplicity', tags: ['wealth', 'life'] },
  // time
  { text: 'Lost time is never found again.', author: 'Benjamin Franklin', theme: 'time', tags: ['loss'] },
  {
    text: 'Write it on your heart that every day is the best day in the year.',
    author: 'Ralph Waldo Emerson',
    theme: 'time',
    tags: ['today', 'gratitude'],
  },
  {
    text: 'The best time to plant a tree was twenty years ago. The second best time is now.',
    author: 'Proverb',
    theme: 'time',
    tags: ['beginning', 'now'],
  },
  { text: 'While we are postponing, life speeds by.', author: 'Seneca', theme: 'time', tags: ['procrastination'] },
  {
    text: 'Begin at once to live, and count each separate day as a separate life.',
    author: 'Seneca',
    theme: 'time',
    tags: ['today', 'beginning'],
  },
  { text: 'Hold every hour in your grasp.', author: 'Seneca', theme: 'time', tags: ['now'] },
  {
    text: 'Do not act as if thou wert going to live ten thousand years.',
    author: 'Marcus Aurelius',
    theme: 'time',
    tags: ['mortality'],
  },
  { text: 'Nothing, Lucilius, is ours, except time.', author: 'Seneca', theme: 'time', tags: ['ownership'] },
  { text: 'Life is short, and Art long.', author: 'Hippocrates', theme: 'time', tags: ['art', 'mortality'] },
  {
    text: 'Seize the day, trusting as little as possible in tomorrow.',
    author: 'Horace',
    theme: 'time',
    tags: ['now', 'today'],
  },
  {
    text: "Dost thou love life? Then do not squander time, for that's the stuff life is made of.",
    author: 'Benjamin Franklin',
    theme: 'time',
    tags: ['life'],
  },
  {
    text: 'Finish each day and be done with it.',
    author: 'Ralph Waldo Emerson',
    theme: 'time',
    tags: ['today', 'letting-go'],
  },
  {
    text: 'Time is but the stream I go a-fishing in.',
    author: 'Henry David Thoreau',
    theme: 'time',
    tags: ['life', 'stream'],
  },
  {
    text: 'Nothing is worth more than this day.',
    author: 'Johann Wolfgang von Goethe',
    theme: 'time',
    tags: ['today'],
  },
  { text: 'Forever is composed of nows.', author: 'Emily Dickinson', theme: 'time', tags: ['now', 'eternity'] },
];

const DAY_MS = 86_400_000;

/** Days a theme stays away after it is shown, when the list allows; the gap shrinks a day at a time when it does not. */
const THEME_GAP = 7;

/**
 * Whether `quote` can follow `recent` (the days before it, latest last): its theme was not shown in the last `gap` days,
 * its author is not the previous day's, and, when `tags` is set, it shares no tag with the previous day either.
 */
function fits(quote: Quote, recent: readonly Quote[], gap: number, tags: boolean): boolean {
  const previous = recent[recent.length - 1];
  return (
    !recent.slice(-gap).some((shown) => shown.theme === quote.theme) &&
    quote.author !== previous.author &&
    !(tags && quote.tags.some((tag) => previous.tags.includes(tag)))
  );
}

/**
 * Every quote once per cycle, in an order that keeps each day different from the days before: each theme is spread
 * evenly over the cycle and stays away for a week after it is shown when the list allows, and no two days in a row
 * share a theme, an author or a tag.
 */
export const QUOTE_ORDER: readonly Quote[] = varied(QUOTES);

export function quoteOfTheDay(date: Date): Quote {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
  return QUOTE_ORDER[day % QUOTE_ORDER.length];
}

/**
 * Orders quotes for variety. Each quote gets a slot in [0, 1) evenly spaced within its theme, so a theme of n quotes
 * comes back about every 1/n of the cycle; then, day by day, the earliest slot that fits after the previous day wins.
 * The cycle wraps around, so of the orders starting on each slot it keeps the one with the fewest days that break the
 * strictest rule, its last days leading into its first ones included.
 */
export function varied(quotes: readonly Quote[]): Quote[] {
  const slots = QUOTE_THEMES.flatMap((theme) => {
    const inTheme = authorsTakingTurns(quotes.filter((quote) => quote.theme === theme));
    return inTheme.map((quote, i) => ({ quote, slot: (i + 0.5) / inTheme.length }));
  })
    .sort((a, b) => a.slot - b.slot)
    .map(({ quote }) => quote);

  let best: Quote[] = [];
  let fewest = Infinity;
  for (let first = 0; first < slots.length && fewest > 0; first++) {
    const order = chain(slots, first);
    const broken = breaks(order);
    if (broken < fewest) [best, fewest] = [order, broken];
  }
  return best;
}

/** The order that starts on `first` and then takes the earliest quote that fits after the previous one. */
function chain(slots: readonly Quote[], first: number): Quote[] {
  const left = [...slots];
  const order = left.splice(first, 1);
  while (left.length > 0) {
    order.push(left.splice(nextFitting(left, order), 1)[0]);
  }
  return order;
}

/** How many days, around the whole cycle, break the strictest rule. */
function breaks(order: readonly Quote[]): number {
  const gap = Math.min(THEME_GAP, order.length - 1);
  if (gap === 0) return 0;
  const cycle = [...order.slice(order.length - gap), ...order];
  return order.filter((quote, i) => !fits(quote, cycle.slice(i, i + gap), gap, true)).length;
}

/** The earliest of `left` that fits after `order`, under the strictest rule some quote meets. */
function nextFitting(left: readonly Quote[], order: readonly Quote[]): number {
  for (let gap = THEME_GAP; gap > 0; gap--) {
    for (const tags of [true, false]) {
      const i = left.findIndex((quote) => fits(quote, order, gap, tags));
      if (i >= 0) return i;
    }
  }
  return 0;
}

/** One quote from each author in turn, so an author's quotes are spread through the theme rather than bunched. */
function authorsTakingTurns(quotes: readonly Quote[]): Quote[] {
  const byAuthor = new Map<string, Quote[]>();
  for (const quote of quotes) byAuthor.set(quote.author, [...(byAuthor.get(quote.author) ?? []), quote]);
  const queues = [...byAuthor.values()];
  const turns: Quote[] = [];
  for (let round = 0; turns.length < quotes.length; round++) {
    for (const queue of queues) if (round < queue.length) turns.push(queue[round]);
  }
  return turns;
}
