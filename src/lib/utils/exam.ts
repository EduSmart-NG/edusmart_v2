export const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Agricultural Science",
  "Economics",
  "Commerce",
  "Accounting",
  "Government",
  "Literature in English",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Geography",
  "Civic Education",
  "History",
  "Further Mathematics",
  "Technical Drawing",
  "Food and Nutrition",
  "Home Economics",
  "Computer Science",
  "French",
  "Hausa",
  "Igbo",
  "Yoruba",
];

export const EXAM_TYPES = [
  "WAEC",
  "JAMB",
  "NECO",
  "GCE",
  "NABTEB",
  "POST_UTME",
];

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

export const YEARS = Array.from(
  { length: 30 },
  (_, i) => new Date().getFullYear() - i
);

export const QUESTION_TYPES = [
  { value: "true_false", label: "True/False" },
  { value: "multiple_choice", label: "Multiple Choice" },
];

export const optionLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export const EXAM_STATUS = ["draft", "published", "archived"];
export const EXAM_CATEGORIES = [
  "certification",
  "practice",
  "mock",
  "assessment",
];
