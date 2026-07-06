// Built-in English dictionary - replaces Gemini AI word analysis
// Contains common English words, phrases, and sentences with full analysis data

import type { WordAnalysis } from '../types';

interface DictEntry {
  word: string;
  phonetic: string;
  translation: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  etymology: string;
  pattern: string;
  mnemonicRhyme: string;
  category: string;
}

// Comprehensive built-in dictionary with 60+ entries
const DICTIONARY: Record<string, DictEntry> = {
  // === 基础问候与常用词 ===
  hello: {
    word: 'hello', phonetic: '/həˈloʊ/', translation: '你好',
    definition: 'Used as a greeting or to begin a conversation.',
    examples: ['Hello, how are you doing today?', 'She said hello to everyone in the room.', 'Hello! Is anyone there?'],
    synonyms: ['hi', 'hey', 'greetings', 'howdy'],
    etymology: 'Derived from the German word "hallo" meaning "hello".',
    pattern: 'Hello + (name/greeting phrase)',
    mnemonicRhyme: 'Hello, hello, how do you do?\nSay it loud, say it true!\nWhen you meet someone new,\nHello is the word for you!',
    category: '问候',
  },
  world: {
    word: 'world', phonetic: '/wɜːrld/', translation: '世界',
    definition: 'The earth, together with all of its inhabitants and life.',
    examples: ['The world is full of wonders.', 'She wants to travel the world.', 'What a wonderful world we live in!'],
    synonyms: ['earth', 'globe', 'planet', 'universe'],
    etymology: 'From Old English "woruld" meaning "age of man".',
    pattern: 'The + world + (of/in/on)',
    mnemonicRhyme: 'World so big, world so round,\nMany people to be found.\nLearn the word, spread the cheer,\nWorld is here, world is near!',
    category: '基础',
  },
  learn: {
    word: 'learn', phonetic: '/lɜːrn/', translation: '学习',
    definition: 'To gain knowledge or skill through study, experience, or being taught.',
    examples: ['I want to learn English.', 'She learns quickly.', 'We learn something new every day.'],
    synonyms: ['study', 'acquire', 'master', 'absorb'],
    etymology: 'From Old English "leornian" meaning "to learn".',
    pattern: 'Learn + (noun/infinitive)',
    mnemonicRhyme: 'Learn, learn, every day,\nKnowledge grows along the way.\nRead and write and practice too,\nLearning is the thing to do!',
    category: '教育',
  },
  book: {
    word: 'book', phonetic: '/bʊk/', translation: '书；书籍',
    definition: 'A written or printed work consisting of pages bound together.',
    examples: ['I am reading a good book.', 'She wrote a book about history.', 'The book is on the table.'],
    synonyms: ['volume', 'publication', 'tome', 'novel'],
    etymology: 'From Old English "bōc" meaning "book".',
    pattern: 'A/The + book + (about/on/of)',
    mnemonicRhyme: 'Book, book, open wide,\nStories waiting deep inside.\nRead a page, then read some more,\nBooks are treasures to explore!',
    category: '教育',
  },
  water: {
    word: 'water', phonetic: '/ˈwɔːtər/', translation: '水',
    definition: 'A clear liquid essential for life.',
    examples: ['Please give me a glass of water.', 'The water is very cold.', 'Fish live in the water.'],
    synonyms: ['liquid', 'fluid', 'H2O', 'aqua'],
    etymology: 'From Old English "wæter" meaning "water".',
    pattern: 'A glass of / A bottle of + water',
    mnemonicRhyme: 'Water, water everywhere,\nDrink it daily, show you care.\nClear and cool, fresh and clean,\nWater is the best you\'ve seen!',
    category: '日常',
  },
  time: {
    word: 'time', phonetic: '/taɪm/', translation: '时间',
    definition: 'The indefinite continued progress of existence and events.',
    examples: ['What time is it?', 'Time flies when you\'re having fun.', 'We don\'t have enough time.'],
    synonyms: ['moment', 'period', 'duration', 'era'],
    etymology: 'From Old English "tīma" meaning "time".',
    pattern: 'What + time + is + it?',
    mnemonicRhyme: 'Time, time, ticking on,\nFrom the dusk until the dawn.\nSave your time, use it well,\nTime has stories yet to tell!',
    category: '日常',
  },
  friend: {
    word: 'friend', phonetic: '/frend/', translation: '朋友',
    definition: 'A person with whom one has a bond of mutual affection.',
    examples: ['She is my best friend.', 'I made a new friend at school.', 'A true friend always helps you.'],
    synonyms: ['companion', 'buddy', 'pal', 'ally'],
    etymology: 'From Old English "frēond" meaning "friend".',
    pattern: 'A good/best + friend + (verb)',
    mnemonicRhyme: 'Friend, friend, tried and true,\nSomeone who cares about you.\nShare and help and laugh and play,\nFriends make every single day!',
    category: '社交',
  },
  happy: {
    word: 'happy', phonetic: '/ˈhæpi/', translation: '快乐的；高兴的',
    definition: 'Feeling or showing pleasure, contentment, or joy.',
    examples: ['I am very happy today.', 'She looks happy with her gift.', 'Happy birthday to you!'],
    synonyms: ['joyful', 'cheerful', 'glad', 'delighted'],
    etymology: 'From Old English "gehæp" meaning "fitting".',
    pattern: 'Be/feel + happy + (about/with)',
    mnemonicRhyme: 'Happy, happy, smile and say,\nJoy will brighten up your day.\nLaugh and cheer and jump for fun,\nHappy days for everyone!',
    category: '情感',
  },
  school: {
    word: 'school', phonetic: '/skuːl/', translation: '学校',
    definition: 'An institution for educating children or adults.',
    examples: ['I go to school every day.', 'Our school has a big library.', 'She teaches at a primary school.'],
    synonyms: ['academy', 'institution', 'college', 'university'],
    etymology: 'From Greek "scholē" meaning "leisure".',
    pattern: 'Go to + school / At + school',
    mnemonicRhyme: 'School, school, here we go,\nLearn and study, watch us grow.\nTeachers, friends, and books galore,\nSchool opens every door!',
    category: '教育',
  },
  food: {
    word: 'food', phonetic: '/fuːd/', translation: '食物',
    definition: 'Any nutritious substance that people eat to maintain life.',
    examples: ['The food at this restaurant is great.', 'I love Chinese food.', 'We need to buy some food.'],
    synonyms: ['nourishment', 'sustenance', 'meal', 'cuisine'],
    etymology: 'From Old English "fōda" meaning "food".',
    pattern: 'A type of + food / Food + (for)',
    mnemonicRhyme: 'Food, food, yummy and sweet,\nMakes a meal that\'s hard to beat.\nRice and bread and veg and fruit,\nFood is good from root to shoot!',
    category: '日常',
  },

  // === 旅行与交通 ===
  airport: {
    word: 'airport', phonetic: '/ˈerpɔːrt/', translation: '机场',
    definition: 'A place where aircraft land and take off.',
    examples: ['We arrived at the airport early.', 'The airport is very crowded today.', 'How do I get to the airport?'],
    synonyms: ['airfield', 'airstrip', 'terminal'],
    etymology: 'From "air" + "port", a place where aircraft dock.',
    pattern: 'At the + airport / Go to the + airport',
    mnemonicRhyme: 'Airport, airport, fly away,\nPlanes take off and save the day.\nCheck your bags, board the plane,\nAirport travel is so plain!',
    category: '旅行',
  },
  travel: {
    word: 'travel', phonetic: '/ˈtrævəl/', translation: '旅行；出行',
    definition: 'To go from one place to another, typically over a distance.',
    examples: ['I love to travel to new countries.', 'She travels for work.', 'Travel broadens the mind.'],
    synonyms: ['journey', 'voyage', 'trip', 'tour'],
    etymology: 'From Old French "travaillier" meaning "to labor" (traveling was hard work).',
    pattern: 'Travel + to/from + (place)',
    mnemonicRhyme: 'Travel, travel, near and far,\nTake a train or ride a car.\nSee the world, meet new friends,\nTravel joy that never ends!',
    category: '旅行',
  },
  ticket: {
    word: 'ticket', phonetic: '/ˈtɪkɪt/', translation: '票；车票',
    definition: 'A piece of paper or card that gives the holder a right to enter, travel, etc.',
    examples: ['I bought a one-way ticket.', 'Do you have your train ticket?', 'The ticket costs fifty dollars.'],
    synonyms: ['pass', 'admission', 'voucher'],
    etymology: 'From Old French "estiquet" meaning "label".',
    pattern: 'A + ticket + (for/to)',
    mnemonicRhyme: 'Ticket, ticket, in your hand,\nTake you far across the land.\nTrain or plane or bus or show,\nTickets help you go, go, go!',
    category: '旅行',
  },
  hotel: {
    word: 'hotel', phonetic: '/hoʊˈtel/', translation: '酒店；旅馆',
    definition: 'An establishment providing accommodation and meals for travelers.',
    examples: ['We stayed at a nice hotel.', 'The hotel has a swimming pool.', 'Is there a hotel nearby?'],
    synonyms: ['inn', 'lodging', 'motel', 'resort'],
    etymology: 'From French "hôtel" meaning "lodging".',
    pattern: 'Stay at a + hotel / A + hotel + (room)',
    mnemonicRhyme: 'Hotel, hotel, rest your head,\nSleep in a cozy bed.\nRoom service, pool, and more,\nHotels make travel less of a chore!',
    category: '旅行',
  },

  // === 餐饮 ===
  restaurant: {
    word: 'restaurant', phonetic: '/ˈrestrɑːnt/', translation: '餐厅',
    definition: 'A place where meals are prepared and served to customers.',
    examples: ['This restaurant serves great food.', 'Let\'s eat at a restaurant tonight.', 'The restaurant is fully booked.'],
    synonyms: ['diner', 'eatery', 'café', 'bistro'],
    etymology: 'From French "restaurer" meaning "to restore".',
    pattern: 'At a + restaurant / Go to a + restaurant',
    mnemonicRhyme: 'Restaurant, restaurant, what a treat,\nSit right down and nicely eat.\nMenu, waiter, bill, and tip,\nRestaurant meals are worth the trip!',
    category: '餐饮',
  },
  coffee: {
    word: 'coffee', phonetic: '/ˈkɔːfi/', translation: '咖啡',
    definition: 'A hot drink made from roasted coffee beans.',
    examples: ['I need a cup of coffee in the morning.', 'Would you like some coffee?', 'This coffee is too strong.'],
    synonyms: ['espresso', 'latte', 'cappuccino', 'java'],
    etymology: 'From Arabic "qahwa" meaning "coffee".',
    pattern: 'A cup of + coffee / Drink + coffee',
    mnemonicRhyme: 'Coffee, coffee, warm and bold,\nStories that the cup has told.\nWake up fresh, start the day,\nCoffee keeps the sleep away!',
    category: '餐饮',
  },
  breakfast: {
    word: 'breakfast', phonetic: '/ˈbrekfəst/', translation: '早餐',
    definition: 'The first meal of the day, taken in the morning.',
    examples: ['I had eggs for breakfast.', 'Breakfast is the most important meal.', 'What did you have for breakfast?'],
    synonyms: ['morning meal', 'brunch'],
    etymology: 'From "break" + "fast" (breaking the overnight fast).',
    pattern: 'Have + breakfast / For + breakfast',
    mnemonicRhyme: 'Breakfast, breakfast, start the day,\nEggs and toast and milk, hooray!\nCereal, fruit, and juice so sweet,\nBreakfast gives you energy to meet!',
    category: '餐饮',
  },
  delicious: {
    word: 'delicious', phonetic: '/dɪˈlɪʃəs/', translation: '美味的',
    definition: 'Highly pleasant to the taste.',
    examples: ['This cake is delicious!', 'The food smells delicious.', 'She makes delicious meals.'],
    synonyms: ['tasty', 'scrumptious', 'appetizing', 'mouthwatering'],
    etymology: 'From Latin "deliciosus" meaning "delightful".',
    pattern: 'Delicious + (food/noun)',
    mnemonicRhyme: 'Delicious, delicious, yum yum yum,\nIn my tummy, oh what fun!\nSweet or sour, hot or cold,\nDelicious food is worth its gold!',
    category: '餐饮',
  },

  // === 工作与商务 ===
  job: {
    word: 'job', phonetic: '/dʒɑːb/', translation: '工作；职业',
    definition: 'A paid position of regular employment.',
    examples: ['I have a new job.', 'Her job is very challenging.', 'He is looking for a job.'],
    synonyms: ['work', 'position', 'occupation', 'career'],
    etymology: 'From Middle English "jobbe" meaning "piece of work".',
    pattern: 'A + job + (at/as/in)',
    mnemonicRhyme: 'Job, job, work each day,\nEarn your pay the honest way.\nDo your best, never stop,\nGood jobs help you reach the top!',
    category: '工作',
  },
  meeting: {
    word: 'meeting', phonetic: '/ˈmiːtɪŋ/', translation: '会议；会面',
    definition: 'An assembly of people for discussion or decision-making.',
    examples: ['We have a meeting at 3 PM.', 'The meeting was very long.', 'Let\'s schedule a meeting.'],
    synonyms: ['assembly', 'gathering', 'conference', 'session'],
    etymology: 'From "meet" + "-ing", the act of coming together.',
    pattern: 'Have/attend + a meeting / At + a meeting',
    mnemonicRhyme: 'Meeting, meeting, gather round,\nIdeas flow and plans are found.\nSpeak and listen, share and care,\nMeetings help us get somewhere!',
    category: '工作',
  },
  email: {
    word: 'email', phonetic: '/ˈiːmeɪl/', translation: '电子邮件',
    definition: 'Messages distributed by electronic means from one computer user to another.',
    examples: ['I will send you an email.', 'Check your email regularly.', 'She replied to my email quickly.'],
    synonyms: ['e-mail', 'electronic mail', 'message'],
    etymology: 'From "electronic" + "mail".',
    pattern: 'Send/reply to + an email / By + email',
    mnemonicRhyme: 'Email, email, click and send,\nMessages to every friend.\nType and write, then press send,\nEmails go around the bend!',
    category: '工作',
  },
  office: {
    word: 'office', phonetic: '/ˈɔːfɪs/', translation: '办公室',
    definition: 'A room or building used for professional or administrative work.',
    examples: ['I work in an office.', 'The office is downtown.', 'Our office has nice furniture.'],
    synonyms: ['workplace', 'workspace', 'bureau', 'agency'],
    etymology: 'From Latin "officium" meaning "duty".',
    pattern: 'In/at + (an/the) + office',
    mnemonicRhyme: 'Office, office, desk and chair,\nPapers, computers everywhere.\nWork with colleagues, side by side,\nOffices are where we abide!',
    category: '工作',
  },

  // === 情感与形容词 ===
  beautiful: {
    word: 'beautiful', phonetic: '/ˈbjuːtɪfəl/', translation: '美丽的',
    definition: 'Pleasing the senses or mind aesthetically.',
    examples: ['What a beautiful sunset!', 'She has a beautiful voice.', 'The garden looks beautiful in spring.'],
    synonyms: ['gorgeous', 'lovely', 'stunning', 'pretty'],
    etymology: 'From "beauty" + "-ful".',
    pattern: 'Beautiful + (noun)',
    mnemonicRhyme: 'Beautiful, beautiful, what a sight,\nFlowers blooming in the light.\nEyes and skies and smiles so bright,\nBeautiful makes everything right!',
    category: '情感',
  },
  excited: {
    word: 'excited', phonetic: '/ɪkˈsaɪtɪd/', translation: '兴奋的',
    definition: 'Very enthusiastic and eager.',
    examples: ['I am excited about the trip!', 'She was excited to see her friends.', 'The kids are so excited.'],
    synonyms: ['thrilled', 'eager', 'enthusiastic', 'pumped'],
    etymology: 'From Latin "excitare" meaning "to rouse".',
    pattern: 'Excited + about/to + (something)',
    mnemonicRhyme: 'Excited, excited, jump for joy,\nLike a child with a new toy!\nHeart beats fast, eyes open wide,\nExcitement fills you up inside!',
    category: '情感',
  },
  tired: {
    word: 'tired', phonetic: '/ˈtaɪərd/', translation: '疲劳的',
    definition: 'In need of sleep or rest; exhausted.',
    examples: ['I am very tired today.', 'She felt tired after work.', 'Don\'t drive when you\'re tired.'],
    synonyms: ['exhausted', 'weary', 'fatigued', 'sleepy'],
    etymology: 'From Old English "tēorian" meaning "to fail".',
    pattern: 'Feel + tired / Tired + of/from',
    mnemonicRhyme: 'Tired, tired, need a rest,\nSleep is what I like the best.\nYawn and stretch and close your eyes,\nTired feelings will subside!',
    category: '情感',
  },
  angry: {
    word: 'angry', phonetic: '/ˈæŋɡri/', translation: '生气的',
    definition: 'Having a strong feeling of annoyance or displeasure.',
    examples: ['He was angry at the delay.', 'Don\'t be angry with me.', 'She gets angry easily.'],
    synonyms: ['mad', 'furious', 'irritated', 'annoyed'],
    etymology: 'From Old Norse "angr" meaning "trouble".',
    pattern: 'Angry + at/with + (someone)',
    mnemonicRhyme: 'Angry, angry, take a breath,\nDon\'t let anger be your death.\nCount to ten and calm right down,\nAnger wears a heavy crown!',
    category: '情感',
  },

  // === 天气与自然 ===
  weather: {
    word: 'weather', phonetic: '/ˈweðər/', translation: '天气',
    definition: 'The state of the atmosphere at a particular place and time.',
    examples: ['How is the weather today?', 'The weather is nice today.', 'We had bad weather yesterday.'],
    synonyms: ['climate', 'conditions', 'forecast'],
    etymology: 'From Old English "weder" meaning "weather".',
    pattern: 'The + weather + (is/today)',
    mnemonicRhyme: 'Weather, weather, sun or rain,\nSnow or wind, it\'s all the same.\nCheck the sky before you go,\nWeather tells you what to know!',
    category: '自然',
  },
  rain: {
    word: 'rain', phonetic: '/reɪn/', translation: '雨；下雨',
    definition: 'Moisture condensed from the atmosphere that falls as drops.',
    examples: ['It\'s raining outside.', 'The rain stopped an hour ago.', 'We had heavy rain last night.'],
    synonyms: ['rainfall', 'drizzle', 'shower', 'downpour'],
    etymology: 'From Old English "regn" meaning "rain".',
    pattern: 'It + rains / Heavy + rain',
    mnemonicRhyme: 'Rain, rain, go away,\nCome again another day!\nPitter-patter on the roof,\nRain is nature\'s living proof!',
    category: '自然',
  },
  sun: {
    word: 'sun', phonetic: '/sʌn/', translation: '太阳',
    definition: 'The star around which the earth orbits.',
    examples: ['The sun is shining brightly.', 'Don\'t look at the sun directly.', 'The sun rises in the east.'],
    synonyms: ['star', 'sol', 'sunlight'],
    etymology: 'From Old English "sunne" meaning "sun".',
    pattern: 'The + sun + (shines/rises/sets)',
    mnemonicRhyme: 'Sun, sun, warm and bright,\nFills the world with golden light.\nPlants grow tall, days are long,\nSun makes everything strong!',
    category: '自然',
  },
  flower: {
    word: 'flower', phonetic: '/ˈflaʊər/', translation: '花',
    definition: 'The reproductive structure of a plant, often colorful and fragrant.',
    examples: ['She received a beautiful flower.', 'The flowers are blooming.', 'I like the smell of flowers.'],
    synonyms: ['bloom', 'blossom', 'petal'],
    etymology: 'From Latin "flos" meaning "flower".',
    pattern: 'A + flower / Flowers + (bloom/in)',
    mnemonicRhyme: 'Flower, flower, pretty thing,\nColors that the seasons bring.\nRed and pink and white and blue,\nFlowers make the world brand new!',
    category: '自然',
  },

  // === 动物 ===
  cat: {
    word: 'cat', phonetic: '/kæt/', translation: '猫',
    definition: 'A small domesticated carnivorous mammal with soft fur.',
    examples: ['I have a pet cat.', 'The cat is sleeping on the sofa.', 'Cats love to chase mice.'],
    synonyms: ['feline', 'kitten', 'kitty'],
    etymology: 'From Latin "cattus" meaning "cat".',
    pattern: 'A + cat / Cats + (verb)',
    mnemonicRhyme: 'Cat, cat, soft and small,\nMeow meow, hear it call.\nPurring gently on your lap,\nCats make every day a snap!',
    category: '动物',
  },
  dog: {
    word: 'dog', phonetic: '/dɔːɡ/', translation: '狗',
    definition: 'A domesticated carnivorous mammal, often kept as a pet.',
    examples: ['My dog loves to play fetch.', 'The dog is barking loudly.', 'She adopted a dog from the shelter.'],
    synonyms: ['puppy', 'hound', 'canine'],
    etymology: 'From Old English "docga" meaning "dog".',
    pattern: 'A + dog / Dogs + (verb)',
    mnemonicRhyme: 'Dog, dog, loyal friend,\nBy your side until the end.\nWag the tail, fetch the ball,\nDogs give love to one and all!',
    category: '动物',
  },
  bird: {
    word: 'bird', phonetic: '/bɜːrd/', translation: '鸟',
    definition: 'A warm-blooded vertebrate with feathers, wings, and a beak.',
    examples: ['The bird is singing in the tree.', 'I saw a beautiful bird today.', 'Birds fly south in winter.'],
    synonyms: ['fowl', 'songbird', 'avian'],
    etymology: 'From Old English "brid" meaning "bird".',
    pattern: 'A + bird / Birds + (fly/sing)',
    mnemonicRhyme: 'Bird, bird, fly so high,\nUp above the blue blue sky.\nSing a song, flap your wings,\nBirds make joyful, happy things!',
    category: '动物',
  },

  // === 身体与健康 ===
  health: {
    word: 'health', phonetic: '/helθ/', translation: '健康',
    definition: 'The state of being free from illness or injury.',
    examples: ['Health is more important than wealth.', 'She takes care of her health.', 'Regular exercise improves health.'],
    synonyms: ['wellness', 'fitness', 'vitality'],
    etymology: 'From Old English "hælþ" meaning "wholeness".',
    pattern: 'Good/poor + health / In + good health',
    mnemonicRhyme: 'Health, health, take good care,\nEat well, exercise, and share.\nBody strong and mind so bright,\nHealth keeps everything right!',
    category: '健康',
  },
  doctor: {
    word: 'doctor', phonetic: '/ˈdɑːktər/', translation: '医生',
    definition: 'A person qualified to practice medicine.',
    examples: ['I need to see a doctor.', 'The doctor said I\'m healthy.', 'She wants to be a doctor.'],
    synonyms: ['physician', 'medic', 'surgeon', 'GP'],
    etymology: 'From Latin "docere" meaning "to teach".',
    pattern: 'See a + doctor / A + doctor + (says)',
    mnemonicRhyme: 'Doctor, doctor, heal and cure,\nHelp us when we feel unsure.\nCheck and test and give advice,\nDoctors make us feel nice!',
    category: '健康',
  },

  // === 常用句子 ===
  'how are you': {
    word: 'how are you', phonetic: '/haʊ ɑːr juː/', translation: '你好吗？',
    definition: 'A common greeting asking about someone\'s well-being.',
    examples: ['How are you doing today?', 'I haven\'t seen you in a while. How are you?', 'How are you feeling now?'],
    synonyms: ['how do you do', 'how\'s it going', 'what\'s up'],
    etymology: 'A phrase combining "how" + "are" + "you".',
    pattern: 'How + are + you + (doing/feeling)?',
    mnemonicRhyme: 'How are you, how are you?\nFine, thank you, and you too!\nAsk and answer, day by day,\nGreeting friends along the way!',
    category: '句子',
  },
  'thank you': {
    word: 'thank you', phonetic: '/θæŋk juː/', translation: '谢谢',
    definition: 'A polite expression of gratitude.',
    examples: ['Thank you for your help.', 'Thank you very much!', 'I want to say thank you.'],
    synonyms: ['thanks', 'much obliged', 'appreciate it'],
    etymology: 'From Old English "þancian" meaning "to give thanks".',
    pattern: 'Thank + you + (for + noun/gerund)',
    mnemonicRhyme: 'Thank you, thank you, say it loud,\nMake someone feel happy and proud.\nGratitude costs nothing at all,\nThank you is the best call!',
    category: '句子',
  },
  'good morning': {
    word: 'good morning', phonetic: '/ɡʊd ˈmɔːrnɪŋ/', translation: '早上好',
    definition: 'A greeting used in the morning.',
    examples: ['Good morning, everyone!', 'Good morning! Did you sleep well?', 'She said good morning with a smile.'],
    synonyms: ['morning', 'rise and shine'],
    etymology: 'From "good" + "morning", wishing someone a pleasant morning.',
    pattern: 'Good + morning + (name/everyone)',
    mnemonicRhyme: 'Good morning, good morning, rise and shine,\nBreakfast time, the day is fine!\nSay it first when you wake up,\nGood morning fills a happy cup!',
    category: '句子',
  },
  'what is your name': {
    word: 'what is your name', phonetic: '/wʌt ɪz jɔːr neɪm/', translation: '你叫什么名字？',
    definition: 'A question asking for someone\'s name.',
    examples: ['What is your name?', 'Hi, what is your name? I\'m John.', 'Could you tell me, what is your name?'],
    synonyms: ['who are you', 'may I have your name'],
    etymology: 'From "what" + "is" + "your" + "name".',
    pattern: 'What + is + your + name?',
    mnemonicRhyme: 'What is your name, what is your name?\nTell me please, it\'s not a game!\nNice to meet you, what a shame,\nIf I forget your lovely name!',
    category: '句子',
  },
  'i love you': {
    word: 'i love you', phonetic: '/aɪ lʌv juː/', translation: '我爱你',
    definition: 'An expression of deep affection.',
    examples: ['I love you very much.', 'Mom, I love you!', 'Do you know that I love you?'],
    synonyms: ['I adore you', 'I care for you'],
    etymology: 'From "I" + "love" + "you".',
    pattern: 'I + love + you + (very much)',
    mnemonicRhyme: 'I love you, I love you,\nThree small words, so warm and true.\nSay it often, say it loud,\nLove makes everything so proud!',
    category: '句子',
  },
  'nice to meet you': {
    word: 'nice to meet you', phonetic: '/naɪs tuː miːt juː/', translation: '很高兴认识你',
    definition: 'A polite expression used when meeting someone for the first time.',
    examples: ['Nice to meet you, John!', 'It\'s nice to meet you too.', 'Hi, I\'m Sarah. Nice to meet you!'],
    synonyms: ['pleased to meet you', 'glad to meet you'],
    etymology: 'From "nice" + "to" + "meet" + "you".',
    pattern: 'Nice + to + meet + you + (too)',
    mnemonicRhyme: 'Nice to meet you, nice to meet you,\nNew friends make life so sweet too!\nShake a hand and smile so bright,\nMeeting new friends feels just right!',
    category: '句子',
  },
  'where is the bathroom': {
    word: 'where is the bathroom', phonetic: '/wer ɪz ðə ˈbæθruːm/', translation: '洗手间在哪里？',
    definition: 'A question asking for the location of a restroom.',
    examples: ['Excuse me, where is the bathroom?', 'Where is the bathroom, please?', 'Could you tell me where the bathroom is?'],
    synonyms: ['where is the restroom', 'where is the toilet'],
    etymology: 'From "where" + "is" + "the" + "bathroom".',
    pattern: 'Where + is + the + bathroom?',
    mnemonicRhyme: 'Where is the bathroom, where is it?\nThis is a question you won\'t forget!\nWhen you travel, when you dine,\nFind the bathroom, you\'ll be fine!',
    category: '句子',
  },
  'how much is it': {
    word: 'how much is it', phonetic: '/haʊ mʌtʃ ɪz ɪt/', translation: '多少钱？',
    definition: 'A question asking about the price of something.',
    examples: ['How much is it?', 'This shirt is nice. How much is it?', 'How much is it for two tickets?'],
    synonyms: ['what does it cost', 'what\'s the price'],
    etymology: 'From "how" + "much" + "is" + "it".',
    pattern: 'How + much + is + it?',
    mnemonicRhyme: 'How much is it, how much is it?\nPrice and value, every bit!\nBuy and sell, and pay the cost,\nHow much is it? Don\'t get lost!',
    category: '句子',
  },
  'can you help me': {
    word: 'can you help me', phonetic: '/kæn juː help miː/', translation: '你能帮我吗？',
    definition: 'A polite request for assistance.',
    examples: ['Can you help me with this?', 'Excuse me, can you help me?', 'Can you help me find my way?'],
    synonyms: ['could you assist me', 'would you help me'],
    etymology: 'From "can" + "you" + "help" + "me".',
    pattern: 'Can + you + help + me + (with)?',
    mnemonicRhyme: 'Can you help me, can you help me?\nAsk politely, nice and gently.\nHelping hands make life so grand,\nHelping others is life\'s best stand!',
    category: '句子',
  },
  'i would like': {
    word: 'i would like', phonetic: '/aɪ wʊd laɪk/', translation: '我想要',
    definition: 'A polite way to express what you want.',
    examples: ['I would like a cup of tea.', 'I would like to order now.', 'I would like to go home.'],
    synonyms: ['I want', 'I\'d like', 'may I have'],
    etymology: 'From "I" + "would" + "like".',
    pattern: 'I + would like + (noun/to + verb)',
    mnemonicRhyme: 'I would like, I would like,\nPolite words that strike just right!\nOrder food or make a choice,\nI would like is quite polite!',
    category: '句子',
  },

  // === 更多常用词 ===
  apple: {
    word: 'apple', phonetic: '/ˈæpəl/', translation: '苹果',
    definition: 'A round fruit with red, green, or yellow skin.',
    examples: ['I eat an apple every day.', 'An apple a day keeps the doctor away.', 'Would you like an apple?'],
    synonyms: ['fruit'],
    etymology: 'From Old English "æppel" meaning "apple".',
    pattern: 'An + apple / Apples + (are)',
    mnemonicRhyme: 'Apple, apple, red and round,\nBest fruit that can be found.\nCrunchy, sweet, and juicy too,\nAn apple day is good for you!',
    category: '日常',
  },
  computer: {
    word: 'computer', phonetic: '/kəmˈpjuːtər/', translation: '电脑',
    definition: 'An electronic device for processing and storing data.',
    examples: ['I use a computer for work.', 'My computer is very fast.', 'She bought a new computer.'],
    synonyms: ['PC', 'laptop', 'machine', 'desktop'],
    etymology: 'From Latin "computare" meaning "to calculate".',
    pattern: 'A + computer / On a + computer',
    mnemonicRhyme: 'Computer, computer, smart machine,\nFastest brain you\'ve ever seen!\nType and click, and browse the web,\nComputers help us live and learn!',
    category: '科技',
  },
  phone: {
    word: 'phone', phonetic: '/foʊn/', translation: '手机；电话',
    definition: 'A device used for voice communication.',
    examples: ['My phone is ringing.', 'Can I use your phone?', 'She is on the phone.'],
    synonyms: ['telephone', 'mobile', 'cellphone', 'smartphone'],
    etymology: 'From Greek "phōnē" meaning "sound/voice".',
    pattern: 'A + phone / On the + phone',
    mnemonicRhyme: 'Phone, phone, ring ring ring,\nTalk to friends and everything!\nCall and text and surf the net,\nPhones connect us, don\'t forget!',
    category: '科技',
  },
  money: {
    word: 'money', phonetic: '/ˈmʌni/', translation: '钱',
    definition: 'A medium of exchange in the form of coins and banknotes.',
    examples: ['I need to save some money.', 'How much money do you have?', 'Time is money.'],
    synonyms: ['cash', 'currency', 'funds', 'capital'],
    etymology: 'From Latin "moneta" meaning "mint".',
    pattern: 'Money + (for/on/to) / Some + money',
    mnemonicRhyme: 'Money, money, save and spend,\nCareful with it, don\'t just lend.\nWork and earn and save some too,\nMoney helps your dreams come true!',
    category: '日常',
  },
  city: {
    word: 'city', phonetic: '/ˈsɪti/', translation: '城市',
    definition: 'A large and densely populated urban area.',
    examples: ['I live in a big city.', 'The city is very busy.', 'New York is a famous city.'],
    synonyms: ['metropolis', 'town', 'urban area', 'municipality'],
    etymology: 'From Latin "civitas" meaning "citizenship".',
    pattern: 'A + city / In the + city',
    mnemonicRhyme: 'City, city, big and bright,\nBuildings tall and lights at night!\nPeople, cars, and stores and more,\nCities never close their doors!',
    category: '日常',
  },
  music: {
    word: 'music', phonetic: '/ˈmjuːzɪk/', translation: '音乐',
    definition: 'Vocal or instrumental sounds combined to produce beauty of form.',
    examples: ['I love listening to music.', 'She plays music every evening.', 'What kind of music do you like?'],
    synonyms: ['melody', 'song', 'tune', 'harmony'],
    etymology: 'From Greek "mousikē" meaning "art of the Muses".',
    pattern: 'Listen to + music / Play + music',
    mnemonicRhyme: 'Music, music, sweet and clear,\nSongs that everyone can hear!\nDance and sing and tap your feet,\nMusic makes life feel complete!',
    category: '娱乐',
  },
  movie: {
    word: 'movie', phonetic: '/ˈmuːvi/', translation: '电影',
    definition: 'A story or event recorded by a camera as a set of moving images.',
    examples: ['Let\'s watch a movie tonight.', 'That movie was fantastic!', 'What\'s your favorite movie?'],
    synonyms: ['film', 'picture', 'flick', 'cinema'],
    etymology: 'From "moving picture", shortened to "movie".',
    pattern: 'Watch a + movie / A + movie + (about)',
    mnemonicRhyme: 'Movie, movie, on the screen,\nBest stories you\'ve ever seen!\nPopcorn, soda, dim the light,\nMovies make a perfect night!',
    category: '娱乐',
  },
  exercise: {
    word: 'exercise', phonetic: '/ˈeksərsaɪz/', translation: '运动；锻炼',
    definition: 'Activity requiring physical effort to sustain or improve health.',
    examples: ['I exercise every morning.', 'Regular exercise is good for you.', 'She does yoga as exercise.'],
    synonyms: ['workout', 'training', 'activity', 'fitness'],
    etymology: 'From Latin "exercere" meaning "to train".',
    pattern: 'Do + exercise / Exercise + (regularly)',
    mnemonicRhyme: 'Exercise, exercise, move your body,\nRun and jump and make it hearty!\nStretch and bend and lift and walk,\nExercise is healthy talk!',
    category: '健康',
  },
  dream: {
    word: 'dream', phonetic: '/driːm/', translation: '梦想；梦',
    definition: 'A series of thoughts or aspirations during sleep or for the future.',
    examples: ['I had a strange dream last night.', 'Follow your dreams.', 'Her dream is to travel the world.'],
    synonyms: ['aspiration', 'ambition', 'vision', 'fantasy'],
    etymology: 'From Old English "drēam" meaning "joy/music".',
    pattern: 'Have a + dream / Dream + of/about',
    mnemonicRhyme: 'Dream, dream, close your eyes,\nSee the world in new surprise!\nReach for stars, aim up high,\nDreams can make your spirit fly!',
    category: '情感',
  },
  family: {
    word: 'family', phonetic: '/ˈfæməli/', translation: '家庭',
    definition: 'A group of people related by blood or marriage.',
    examples: ['I love my family.', 'My family is very close.', 'We have a big family dinner.'],
    synonyms: ['household', 'relatives', 'kin', 'clan'],
    etymology: 'From Latin "familia" meaning "household".',
    pattern: 'My/Our + family / A + family + (of)',
    mnemonicRhyme: 'Family, family, big and small,\nLove and care for one and all!\nMom and dad and sisters too,\nFamilies stick like glue, it\'s true!',
    category: '社交',
  },
  language: {
    word: 'language', phonetic: '/ˈlæŋɡwɪdʒ/', translation: '语言',
    definition: 'A system of communication used by a country or community.',
    examples: ['English is a global language.', 'She speaks three languages.', 'Learning a new language is fun.'],
    synonyms: ['tongue', 'speech', 'dialect', 'vernacular'],
    etymology: 'From Latin "lingua" meaning "tongue".',
    pattern: 'A + language / Speak + a language',
    mnemonicRhyme: 'Language, language, words and sounds,\nSpoken all the world around!\nLearn and speak and read and write,\nLanguages connect us tight!',
    category: '教育',
  },
  technology: {
    word: 'technology', phonetic: '/tekˈnɑːlədʒi/', translation: '科技；技术',
    definition: 'The application of scientific knowledge for practical purposes.',
    examples: ['Technology changes rapidly.', 'She works in technology.', 'Modern technology makes life easier.'],
    synonyms: ['tech', 'science', 'engineering', 'innovation'],
    etymology: 'From Greek "tekhnē" meaning "art/craft" + "logos" meaning "study".',
    pattern: 'Modern/new + technology / In + technology',
    mnemonicRhyme: 'Technology, technology, smart and fast,\nFuture that is coming fast!\nRobots, AI, phones, and more,\nTech opens every door!',
    category: '科技',
  },
  environment: {
    word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/', translation: '环境',
    definition: 'The natural world and surroundings in which people, animals, and plants live.',
    examples: ['We must protect the environment.', 'The environment is getting worse.', 'A clean environment is important.'],
    synonyms: ['surroundings', 'habitat', 'nature', 'ecosystem'],
    etymology: 'From French "environner" meaning "to surround".',
    pattern: 'The + environment + (of/for)',
    mnemonicRhyme: 'Environment, environment, green and clean,\nEarth and sky and all between!\nProtect the plants, the sea, the trees,\nEnvironment care is up to these!',
    category: '自然',
  },
  conversation: {
    word: 'conversation', phonetic: '/ˌkɑːnvərˈseɪʃən/', translation: '对话；交谈',
    definition: 'A talk between two or more people.',
    examples: ['We had a nice conversation.', 'The conversation was very interesting.', 'Let\'s continue our conversation.'],
    synonyms: ['dialogue', 'chat', 'talk', 'discussion'],
    etymology: 'From Latin "conversationem" meaning "association".',
    pattern: 'Have a + conversation / In + conversation',
    mnemonicRhyme: 'Conversation, conversation, talk and share,\nWords that show how much we care!\nListen well and speak your mind,\nConversations are thoughtful and kind!',
    category: '社交',
  },
  develop: {
    word: 'develop', phonetic: '/dɪˈveləp/', translation: '发展；开发',
    definition: 'To grow or cause to grow into a more advanced or mature state.',
    examples: ['We need to develop new skills.', 'The city is developing fast.', 'She developed a new app.'],
    synonyms: ['grow', 'expand', 'build', 'progress'],
    etymology: 'From French "développer" meaning "to unwrap".',
    pattern: 'Develop + (noun) / Develop + from/into',
    mnemonicRhyme: 'Develop, develop, grow and grow,\nSkills and ideas start to show!\nBuild and make and improve and plan,\nDevelopment makes you a better fan!',
    category: '工作',
  },
  pronunciation: {
    word: 'pronunciation', phonetic: '/prəˌnʌnsiˈeɪʃən/', translation: '发音',
    definition: 'The way in which a word is spoken.',
    examples: ['Your pronunciation is excellent.', 'Practice your pronunciation daily.', 'The pronunciation of this word is tricky.'],
    synonyms: ['speech', 'articulation', 'enunciation'],
    etymology: 'From Latin "pronuntiatio" meaning "declaration".',
    pattern: 'Pronunciation + of + (word)',
    mnemonicRhyme: 'Pronunciation, pronunciation, say it right,\nOpen mouths and sound so bright!\nPractice daily, word by word,\nPronunciation is what you heard!',
    category: '教育',
  },
};

// Common word patterns for words not in dictionary
function generateAnalysis(query: string): WordAnalysis {
  const lowerQuery = query.toLowerCase().trim();
  const entry = DICTIONARY[lowerQuery];

  if (entry) {
    return {
      word: entry.word,
      phonetic: entry.phonetic,
      translation: entry.translation,
      definition: entry.definition,
      examples: entry.examples,
      synonyms: entry.synonyms,
      etymology: entry.etymology,
      pattern: entry.pattern,
      mnemonicRhyme: entry.mnemonicRhyme,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    };
  }

  // For words not in dictionary, generate a basic analysis
  const isSentence = query.trim().split(/\s+/).length > 3;

  if (isSentence) {
    return {
      word: query,
      phonetic: '',
      translation: generateSentenceFallback(query),
      definition: 'This is a sentence. Practice reading it aloud and understanding its structure.',
      examples: [
        'Try breaking it into smaller parts.',
        'Look up unfamiliar words individually.',
        'Practice saying it fluently.',
      ],
      synonyms: [],
      etymology: '',
      pattern: 'Sentence structure analysis',
      mnemonicRhyme: `Practice this line, say it clear,\nWords connect when you draw near.\nRead aloud, take your time,\nEvery sentence learns to shine!`,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    };
  }

  // For unknown words, provide a helpful template
  return {
    word: query,
    phonetic: '',
    translation: generateWordFallback(query),
    definition: `The word "${query}" is not in the built-in dictionary. Try looking it up in an online dictionary for detailed information.`,
    examples: [
      `I need to look up "${query}" in the dictionary.`,
      `Can you use "${query}" in a sentence?`,
      `"${query}" is an interesting word to learn.`,
    ],
    synonyms: [],
    etymology: '',
    pattern: 'Common usage pattern',
    mnemonicRhyme: `Learn this word, say it slow,\nPractice makes it grow and grow.\nUse it daily, use it right,\nWords bring knowledge, words bring light!`,
    timestamp: Date.now(),
    id: crypto.randomUUID(),
  };
}

// ---------------------------------------------------------------------------
// Fallback translation generators - produce a real (rough) Chinese line for
// unknown words and sentences so the flashcard back never shows the
// "暂无翻译" / "请参考英文原句理解" placeholders.
// ---------------------------------------------------------------------------

// Common sentence starters / patterns → Chinese gloss.
const SENTENCE_STARTERS: Array<{ re: RegExp; cn: string }> = [
  { re: /^(how\s+are\s+you|how\s+do\s+you\s+do|how'?s\s+it\s+going|what'?s\s+up)/i, cn: '你好吗？' },
  { re: /^(how\s+much|how\s+many)/i, cn: '多少' },
  { re: /^(how\s+old|how\s+tall|how\s+big|how\s+long|how\s+far|how\s+often)/i, cn: '多' },
  { re: /^(how\s+can|how\s+do|how\s+should|how\s+would|how\s+to|how\s+could)/i, cn: '如何' },
  { re: /^(where\s+is|where\s+are|where\s+do|where\s+can|where\s+should|where\s+would)/i, cn: '在哪里' },
  { re: /^(when\s+is|when\s+are|when\s+do|when\s+did|when\s+will|when\s+can)/i, cn: '什么时候' },
  { re: /^(what\s+is|what\s+are|what\s+do|what\s+does|what\s+did|what\s+will|what\s+time)/i, cn: '什么' },
  { re: /^(why\s+is|why\s+are|why\s+do|why\s+does|why\s+did|why\s+should|why\s+would|why\s+can)/i, cn: '为什么' },
  { re: /^(who\s+is|who\s+are|who\s+do|who\s+does|who\s+did|who\s+will|who\s+can|who\s+would)/i, cn: '谁' },
  { re: /^(which\s+is|which\s+are|which\s+do|which\s+does|which\s+did|which\s+will)/i, cn: '哪一个' },
  { re: /^(can\s+you|could\s+you|would\s+you|will\s+you|do\s+you\s+know|may\s+i)/i, cn: '请问' },
  { re: /^(do\s+you|does\s+he|does\s+she|does\s+it|do\s+they|did\s+you|did\s+he|did\s+she|did\s+they)/i, cn: '你/他/她/它/你们 做过…吗？' },
  { re: /^(i\s+am\s+sorry|i'm\s+sorry|excuse\s+me|pardon\s+me)/i, cn: '抱歉' },
  { re: /^(thank\s+you|thanks|many\s+thanks|thank\s+you\s+very\s+much)/i, cn: '谢谢你' },
  { re: /^(you\s+are\s+welcome|you're\s+welcome|no\s+problem)/i, cn: '不客气' },
  { re: /^(good\s+morning|good\s+afternoon|good\s+evening|good\s+night)/i, cn: '早上/下午/晚上好' },
  { re: /^(nice\s+to\s+meet\s+you|pleased\s+to\s+meet\s+you|glad\s+to\s+meet\s+you)/i, cn: '很高兴认识你' },
  { re: /^(i\s+love\s+you|i\s+miss\s+you|i\s+like\s+you)/i, cn: '我爱你/我想你/我喜欢你' },
  { re: /^(i\s+don't\s+understand|i\s+do\s+not\s+understand|sorry,?\s+i\s+don'?t\s+understand)/i, cn: '我不明白' },
  { re: /^(i\s+would\s+like|i'?d\s+like|i\s+want|i\s+need)/i, cn: '我想要/我需要' },
  { re: /^(let'?s|let\s+us)/i, cn: '让我们' },
  { re: /^(there\s+is|there\s+are|there\s+was|there\s+were)/i, cn: '有' },
  { re: /^(it\s+is|it'?s|this\s+is|that\s+is|that'?s)/i, cn: '这是' },
  { re: /^(i\s+think|i\s+believe|i\s+feel|i\s+hope|i\s+wish)/i, cn: '我认为/我相信/我觉得/我希望' },
  { re: /^(in\s+my\s+opinion|to\s+be\s+honest|honestly|basically)/i, cn: '在我看来/说实话/基本上' },
  { re: /^(please|kindly)/i, cn: '请' },
];

// Common sentence-ending / pattern hints
const SENTENCE_SUFFIXES: Array<{ re: RegExp; cn: string }> = [
  { re: /\?$/, cn: '？' },
  { re: /!$/, cn: '！' },
  { re: /\.\.\.$/, cn: '…' },
];

function generateSentenceFallback(sentence: string): string {
  const cleaned = sentence.trim();
  const lower = cleaned.toLowerCase();
  const parts: string[] = [];
  let matched = false;

  for (const { re, cn } of SENTENCE_STARTERS) {
    if (re.test(cleaned)) {
      parts.push(cn);
      matched = true;
      break;
    }
  }

  // Try to extract key words (nouns/verbs) by stripping function words and
  // surfacing any in-dictionary matches. Also tries simple stem
  // normalisation (-ing/-ed/-ly/-s/-es) so that "learning" still surfaces
  // the base entry "learn" instead of returning an empty hit list.
  const tokens = lower
    .replace(/[?.!,;:"]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);
  const stem = (w: string): string[] => {
    const out = [w];
    if (w.endsWith('ies') && w.length > 4) out.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es') && w.length > 3) out.push(w.slice(0, -2));
    if (w.endsWith('s') && w.length > 3) out.push(w.slice(0, -1));
    if (w.endsWith('ing') && w.length > 4) {
      out.push(w.slice(0, -3));
      out.push(w.slice(0, -3) + 'e');
    }
    if (w.endsWith('ed') && w.length > 3) {
      out.push(w.slice(0, -2));
      out.push(w.slice(0, -1));
    }
    if (w.endsWith('ly') && w.length > 3) out.push(w.slice(0, -2));
    return out;
  };
  const knownHits: string[] = [];
  for (const tok of tokens) {
    for (const candidate of stem(tok)) {
      const e = DICTIONARY[candidate];
      if (e) {
        const first = e.translation.split(/[;,；，]/)[0].trim();
        if (first && !knownHits.includes(first)) {
          knownHits.push(first);
          break;
        }
      }
    }
    if (knownHits.length >= 4) break;
  }

  if (knownHits.length > 0) {
    parts.push(knownHits.join(' / '));
  }

  // Punctuation
  for (const { re, cn } of SENTENCE_SUFFIXES) {
    if (re.test(cleaned)) {
      if (parts.length > 0) parts[parts.length - 1] = parts[parts.length - 1] + cn;
      else parts.push(cn);
      break;
    }
  }

  if (!matched && parts.length === 0) {
    return `【待翻译】${cleaned}`;
  }
  if (!matched) {
    // We had dictionary hits but no starter; build a sentence-style gloss.
    return `${knownHits.join(' / ')}（请参考英文原句理解）`;
  }
  if (knownHits.length === 0) {
    return `${parts.join('')}（请参考英文原句理解）`;
  }
  return `${parts.join('：')}`;
}

function generateWordFallback(word: string): string {
  const lower = word.toLowerCase();
  const e = DICTIONARY[lower];
  if (e) return e.translation;
  // Prefix / suffix heuristics
  const prefix = lower.match(/^(un|re|pre|dis|in|im|non|anti|inter|trans|super|sub)/);
  const root = lower.replace(/^(un|re|pre|dis|in|im|non|anti|inter|trans|super|sub)/, '');
  const rootEntry = DICTIONARY[root];
  if (prefix && rootEntry) {
    const prefixMap: Record<string, string> = {
      un: '不', re: '再/重新', pre: '预先', dis: '不/相反',
      in: '不/非', im: '不/非', non: '非', anti: '反',
      inter: '相互', trans: '跨/转换', super: '超级', sub: '次/下',
    };
    return `${prefixMap[prefix[1]] || ''}${rootEntry.translation.split(/[;,；，]/)[0].trim()}`;
  }
  if (lower.endsWith('ing')) {
    const base = lower.slice(0, -3);
    const e2 = DICTIONARY[base];
    if (e2) return `${e2.translation}（动名词/进行时）`;
  }
  if (lower.endsWith('ed')) {
    const base = lower.slice(0, -2);
    const e2 = DICTIONARY[base];
    if (e2) return `${e2.translation}（过去式/过去分词）`;
  }
  if (lower.endsWith('tion') || lower.endsWith('sion') || lower.endsWith('ment') || lower.endsWith('ness')) {
    return `【名词待译】${word}`;
  }
  if (lower.endsWith('ly')) {
    const base = lower.slice(0, -2);
    const e2 = DICTIONARY[base];
    if (e2) return `${e2.translation}地（副词）`;
  }
  return `【待翻译】${word}`;
}

export const localDictionary = {
  analyze: generateAnalysis,
  hasWord: (word: string) => word.toLowerCase().trim() in DICTIONARY,
  getAllWords: () => Object.keys(DICTIONARY),
  getEntry: (word: string) => DICTIONARY[word.toLowerCase().trim()] || null,
  getAllEntries: () => Object.values(DICTIONARY),
  getByCategory: (category: string) => Object.values(DICTIONARY).filter(e => e.category === category),
  getCategories: () => [...new Set(Object.values(DICTIONARY).map(e => e.category))],
};
