// Static demo clues used by the public /demo preview.
// Not stored in the database. Do not query Supabase for these.

export type DemoClue = {
  id: string;
  clue: string;
  answer: string;
  explanation: string;
};

export const DEMO_CLUES: DemoClue[] = [
  {
    id: "demo-1",
    clue: "עושה צחוק מהגבעה.",
    answer: "מהתל",
    explanation:
      "מהתל פירושו עושה צחוק או לועג, נשמע גם כמו 'מ-ה-תל' - תל הוא גבעה.",
  },
  {
    id: "demo-2",
    clue: "יישוב צפוני מצמיח את הגבינה.",
    answer: "מגדל העמק",
    explanation:
      "מגדל העמק הוא יישוב בצפון הארץ. 'מגדל' פירושו מצמיח או מטפח, ו-'עמק' הוא גם השם של גבינה מוכרת.",
  },
  {
    id: "demo-3",
    clue: "מצביעות אלימות.",
    answer: "מרימות ידיים",
    explanation:
      "נשים שמצביעות מרימות ידיים, והביטוי יכול להתפרש גם כנוקטות באלימות.",
  },
];
