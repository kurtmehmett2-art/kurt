export interface ReadyPlanUnit {
  unitNumber: number;
  title: string;
  topic: string;
  dailyOutline: string;
  skills: string;
  vocabulary: string[];
  teacherInstruction: string;
}

export interface GradePlans {
  grade: string;
  title: string;
  description: string;
  units: ReadyPlanUnit[];
}

export const READY_PLANS: Record<string, GradePlans> = {
  '5': {
    grade: '5',
    title: '5. Sınıf İngilizce Günlük Ders Planları',
    description: 'A1.1 Seviyesi - Türkiye Yüzyılı Maarif Modeli ile %100 Uyumlu Sade ve Eğlenceli Aktiviteler',
    units: [
      {
        unitNumber: 1,
        title: 'School Life (Okul Hayatı)',
        topic: 'Classroom Language & Favorite Subjects',
        dailyOutline: 'Öğrenciler okul derslerini, dilleri ve sevdikleri hobileri tanıtır. Sınıf içi yönergeleri takip etme alıştırması yapılır.',
        skills: 'Konuşma (Speaking) & Dinleme (Listening)',
        vocabulary: ['Maths', 'Science', 'History', 'Physical Education', 'German', 'speak', 'solve'],
        teacherInstruction: "Ask students: 'What is your favorite subject?' and let them draw a card of it."
      },
      {
        unitNumber: 2,
        title: 'My Town (Benim Şehrim)',
        topic: 'Giving Simple Directions & Public Buildings',
        dailyOutline: 'Şehirdeki binaları (fırın, kütüphane, hastane) tanıma ve "Excuse me, where is the...?" kalıbıyla basit adres sorma.',
        skills: 'Konuşma (Speaking) & Okuma (Reading)',
        vocabulary: ['bakery', 'library', 'hospital', 'toy shop', 'next to', 'behind', 'between'],
        teacherInstruction: "Draw a simple map on the board and let students guide a toy car to the bakery."
      },
      {
        unitNumber: 3,
        title: 'Hello! (Merhaba!)',
        topic: 'Countries, Nationalities & Languages',
        dailyOutline: 'Farklı ülkeleri, milletleri ve konuşulan dilleri sorma. "Where are you from?" ve "I am from Turkey" kalıpları çalışılır.',
        skills: 'Bütünleşik (Integrated)',
        vocabulary: ['Turkey', 'England', 'Turkish', 'English', 'Japan', 'Japanese', 'nationality'],
        teacherInstruction: "Pass a globe around. When music stops, the student says: 'I am from [country where thumb lands]'."
      },
      {
        unitNumber: 4,
        title: 'My Daily Routine (Günlük Rutinim)',
        topic: 'Telling Time & Simple Present Habits',
        dailyOutline: 'Günlük yapılan rutin işleri (uyanma, kahvaltı yapma, okula gitme) saatleriyle ifade etme etkinlikleri.',
        skills: 'Yazma (Writing) & Dinleme (Listening)',
        vocabulary: ['wake up', 'have breakfast', 'go to school', 'brush teeth', 'quarter past', 'half past'],
        teacherInstruction: "Have students draw a clock face and speak about what they do at that exact hour."
      },
      {
        unitNumber: 5,
        title: 'Health (Sağlık)',
        topic: 'Talking about Illnesses & Giving Advice',
        dailyOutline: 'Yaygın hastalıkları (baş ağrısı, grip, öksürük) ifade etme ve "should / shouldn\'t" kullanarak basit tavsiyeler verme.',
        skills: 'Okuma (Reading) & Konuşma (Speaking)',
        vocabulary: ['headache', 'cold', 'sore throat', 'cough', 'should', 'drink warm water', 'rest'],
        teacherInstruction: "Play role-play: One student acts sick (pantomime), the other plays doctor and gives advice."
      }
    ]
  },
  '6': {
    grade: '6',
    title: '6. Sınıf İngilizce Günlük Ders Planları',
    description: 'A1.2 Seviyesi - Günlük Yaşam İletişimi, Karşılaştırma Cümleleri ve Eğlenceli Aktiviteler',
    units: [
      {
        unitNumber: 1,
        title: 'Life (Günlük Yaşam)',
        topic: 'Daily Routines, Dates & Breakfast Habits',
        dailyOutline: 'Haftalık aktiviteler, tam tarih söyleme (sıra sayıları) ve kahvaltı alışkanlıklarını karşılaştırma çalışması yapılır.',
        skills: 'Konuşma (Speaking) & Dinleme (Listening)',
        vocabulary: ['run errands', 'take care of the dog', 'write diary', 'first', 'second', 'on weekdays'],
        teacherInstruction: "Create a 'My Perfect Sunday' timeline. Students present 3 main activities to their peers."
      },
      {
        unitNumber: 2,
        title: 'Yummy Breakfast (Nefis Kahvaltı)',
        topic: 'Expressing Likes/Dislikes & Food Vocabulary',
        dailyOutline: 'Kahvaltıdaki yiyecek-içecek isimleri. "Do you want some...?" veya "It is my favorite" gibi günlük diyaloglar çalışılır.',
        skills: 'Bütünleşik (Integrated)',
        vocabulary: ['croissant', 'olives', 'honey', 'cheese', 'nutritious', 'junk food', 'Do you want some?'],
        teacherInstruction: "Set up a mock 'Breakfast Cafe' in class. Students order and serve breakfast items."
      },
      {
        unitNumber: 3,
        title: 'Downtown (Şehir Merkezi)',
        topic: 'Comparing City vs Country Life (Comparatives)',
        dailyOutline: 'Şehir ve köy hayatını "comparative" (daha kalabalık, daha yeşil) sıfatlarla karşılaştırma ve şimdiki zaman kullanımı.',
        skills: 'Okuma (Reading) & Yazma (Writing)',
        vocabulary: ['downtown', 'street', 'busy', 'crowded', 'quieter', 'cleaner', 'traffic jam'],
        teacherInstruction: "Put photos of Istanbul and a quiet village side-by-side. Students write 3 sentences comparing them."
      },
      {
        unitNumber: 4,
        title: 'Weather and Emotions (Hava ve Duygular)',
        topic: 'Describing Weather & Associating Feelings',
        dailyOutline: 'Hava durumunu sorma ve havanın insanların ruh halleri (mutlu, uykulu, enerjik) üzerindeki etkisini konuşma.',
        skills: 'Dinleme (Listening) & Konuşma (Speaking)',
        vocabulary: ['rainy', 'foggy', 'stormy', 'anxious', 'sleepy', 'happy', 'How is the weather?'],
        teacherInstruction: "Make weather sound effects (clapping for rain). Ask students how they feel when it rains."
      },
      {
        unitNumber: 5,
        title: 'At the Fair (Lunaparkta)',
        topic: 'Carnival Rides & Expressing Opinions',
        dailyOutline: 'Lunaparktaki oyuncaklar (dönme dolap, çarpışan arabalar) ve onlara yönelik beğenilerimizi ("I think they are exciting") ifade etme.',
        skills: 'Konuşma (Speaking) & Okuma (Reading)',
        vocabulary: ['bumper cars', 'roller coaster', 'ferris wheel', 'exciting', 'boring', 'agree', 'disagree'],
        teacherInstruction: "Vote on the most exciting ride. Use thumbs up/down for agree/disagree."
      }
    ]
  },
  '7': {
    grade: '7',
    title: '7. Sınıf İngilizce Günlük Ders Planları',
    description: 'A2.1 Seviyesi - Kişisel Portreler, Spor Alışkanlıkları ve Geçmiş Zaman Anlatımları',
    units: [
      {
        unitNumber: 1,
        title: 'Appearance & Personality (Görünüş ve Kişilik)',
        topic: 'Describing People & Making Comparisons',
        dailyOutline: 'İnsanların dış görünüşlerini (boy, kilo, saç rengi) ve kişilik özelliklerini (cömert, dürüst) karşılaştırarak anlatma.',
        skills: 'Konuşma (Speaking) & Yazma (Writing)',
        vocabulary: ['slim', 'plump', 'honest', 'generous', 'outgoing', 'stubborn', 'more intelligent'],
        teacherInstruction: "Describe a famous person or cartoon character without naming them. Students guess who they are."
      },
      {
        unitNumber: 2,
        title: 'Sports (Sporlar)',
        topic: 'Frequency of Sports & Game Equipment',
        dailyOutline: 'Farklı spor dalları, gerekli ekipmanlar ve sıklık zarfları (once, twice, always) kullanarak antrenman rutinlerini anlatma.',
        skills: 'Bütünleşik (Integrated)',
        vocabulary: ['spectator', 'equipment', 'goggles', 'indoor', 'outdoor', 'once a week', 'achieve'],
        teacherInstruction: "Ask students: 'How often do you exercise?' and plot a frequency chart on the whiteboard."
      },
      {
        unitNumber: 3,
        title: 'Biographies (Biyografiler)',
        topic: 'Narrating Past Events (Simple Past Tense)',
        dailyOutline: 'Tarihe geçmiş bilim insanı, sporcu veya sanatçıların hayat hikayelerini geçmiş zaman kalıbıyla kronolojik olarak anlatma.',
        skills: 'Okuma (Reading) & Yazma (Writing)',
        vocabulary: ['born', 'grow up', 'graduate', 'discover', 'invent', 'achievement', 'die'],
        teacherInstruction: "Give students timeline cards of Atatürk or Marie Curie. They arrange them and read the sentences aloud."
      },
      {
        unitNumber: 4,
        title: 'Wild Animals (Vahşi Hayvanlar)',
        topic: 'Habitats, Physical Descriptions & Protection',
        dailyOutline: 'Vahşi hayvanların yaşam alanları (orman, çöl), beslenme alışkanlıkları ve nesillerini korumak için öneriler sunma.',
        skills: 'Dinleme (Listening) & Konuşma (Speaking)',
        vocabulary: ['extinct', 'endangered', 'habitat', 'carnivore', 'herbivore', 'protect', 'destroy'],
        teacherInstruction: "Play sound clips of wild animals. Students identify the animal and describe its habitat."
      },
      {
        unitNumber: 5,
        title: 'Television (Televizyon)',
        topic: 'TV Program Preferences & Expressing Opinions',
        dailyOutline: 'Televizyon program türleri ve "prefer" kalıbıyla hangi programı neye tercih ettiğimizi sebepleriyle açıklama.',
        skills: 'Konuşma (Speaking) & Okuma (Reading)',
        vocabulary: ['talk show', 'documentary', 'sitcom', 'prefer', 'boring', 'informative', 'couch potato'],
        teacherInstruction: "Ask: 'Would you prefer a sitcom or a documentary?' and have students debate for 2 minutes."
      }
    ]
  },
  '8': {
    grade: '8',
    title: '8. Sınıf İngilizce LGS Günlük Ders Planları',
    description: 'A2.2 Seviyesi - Arkadaşlık İlişkileri, Tercihler, Yemek Tarifleri ve İletişim Yöntemleri',
    units: [
      {
        unitNumber: 1,
        title: 'Friendship (Arkadaşlık)',
        topic: 'Accepting/Refusing Invitations & Friend Qualities',
        dailyOutline: 'Davet etme, kabul etme, kibarca reddetme ve mazeret bildirme kalıpları. Güvenilir arkadaş özelliklerini tartışma.',
        skills: 'Konuşma (Speaking) & Dinleme (Listening)',
        vocabulary: ['back up', 'count on', 'refuse', 'apologize', 'excuse', 'laid-back', 'reliable'],
        teacherInstruction: "Have students write a birthday invitation card and practice accepting or declining it politely with excuses."
      },
      {
        unitNumber: 2,
        title: 'Teen Life (Gençlik Yaşamı)',
        topic: 'Preferences, Music & Daily Habits of Teens',
        dailyOutline: 'Gençlerin günlük aktiviteleri, spor ve müzik tercihleri. "prefer" ve "would rather" kalıplarıyla kıyaslama yapma.',
        skills: 'Bütünleşik (Integrated)',
        vocabulary: ['unbearable', 'trendy', 'terrific', 'prefer', 'exciting', 'be fond of', 'pay attention'],
        teacherInstruction: "Play 15-second music clips (jazz, rap, classical) and ask students to write adjectives describing them."
      },
      {
        unitNumber: 3,
        title: 'In The Kitchen (Mutfakta)',
        topic: 'Describing a Recipe & Sequencing Actions',
        dailyOutline: 'Yemek yapma süreçleri, mutfak araç gereçleri ve sıralama kelimeleri (first, second, then, next, finally) ile tarif anlatma.',
        skills: 'Yazma (Writing) & Okuma (Reading)',
        vocabulary: ['peel', 'chop', 'dice', 'fry', 'bake', 'ingredients', 'process', 'first', 'finally'],
        teacherInstruction: "Ask students to write down the 4-step recipe for making their favorite sandwich."
      },
      {
        unitNumber: 4,
        title: 'On The Phone (Telefonda İletişim)',
        topic: 'Telephone Etiquette & Communication Ways',
        dailyOutline: 'Telefonda kendini tanıtma, mesaj bırakma, anlama kontrolü ve farklı iletişim yollarını (yüz yüze, mesaj) kıyaslama.',
        skills: 'Dinleme (Listening) & Konuşma (Speaking)',
        vocabulary: ['hang up', 'hold on', 'put through', 'available', 'leave a message', 'keep in touch'],
        teacherInstruction: "Role-play phone call. Student A wants to speak to B, but B is not available. Student A leaves a message."
      },
      {
        unitNumber: 5,
        title: 'The Internet (İnternet)',
        topic: 'Online Habits, Icons & Safety Rules',
        dailyOutline: 'İnternet kullanımı alışkanlıkları, terimler (tarayıcı, indirme) ve internette güvenli kalma kuralları üzerine grup çalışması.',
        skills: 'Okuma (Reading) & Konuşma (Speaking)',
        vocabulary: ['browser', 'download', 'upload', 'attachment', 'social network', 'search engine', 'safety'],
        teacherInstruction: "Show safety rules cards (e.g. 'Never share passwords'). Students categorize them as safe/unsafe."
      }
    ]
  }
};
