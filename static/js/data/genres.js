// Django equivalent: a TextChoices enum in models.py or a Genre model
// Example Django usage:
//   class Genre(models.TextChoices):
//       HORROR = 'horror', 'siekacz horrorów'
//
// These labels are curatorial content — do NOT rename without discussion.
// They appear on the end screen as the user's "żywioł filmowy".

const GENRE_LABELS = {
  'horror':          'siekacz horrorów',
  'thriller':        'łowca thrillerów',
  'noir':            'czciciel mroku',
  'kryminał':        'detektyw kina',
  'dramat':          'dramaturg salonów',
  'komedia':         'kronikarz śmiechu',
  'romans':          'romantyk srebrnego ekranu',
  'melodramat':      'płakacz pierwszego rzędu',
  'akcja':           'żołnierz ekranu',
  'przygodowy':      'odkrywca nowych światów',
  'western':         'rewolwerowiec kina',
  'wojenny':         'kronikarz wojen',
  'szpiegowski':     'agent specjalny',
  'superbohaterski': 'obrońca galaktyki',
  'sci-fi':          'wizjoner przyszłości',
  'fantasy':         'strażnik magii',
  'animacja':        'dusza rysunku',
  'baśń':            'bajarz wieczorny',
  'surrealizm':      'budowniczy snów',
  'art-house':       'kapłan sztuki',
  'slow-cinema':     'kontemplator ciszy',
  'eksperyment':     'demolator formy',
  'esej-filmowy':    'myśliciel z projektora',
  'dokumentalny':    'łowca prawdy',
  'mockumentary':    'kłamca z kamerą',
  'body-horror':     'anatom ekranu',
  'giallo':          'kolekcjoner czerwieni',
  'yakuza':          'samuraj multipleksu',
  'road-movie':      'nomad asfaltu',
  'coming-of-age':   'strażnik niewinności',
  'mumblecore':      'szeptem o życiu',
  'neon-noir':       'nocny łowca neonów',
  'musical':         'śpiewak w ciemności',
};
