/**
 * seed-formations.js
 * Run: node seed-formations.js
 * Seeds 3 full training modules (LLR, LLT, HLT) with lessons and quiz questions
 * directly into MongoDB, bypassing the API.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smartpm';

// ─── Schema (minimal, matching training.schema.ts) ──────────────────────────

const QuizQuestionSchema = new mongoose.Schema({
  question:     { type: String, required: true },
  options:      { type: [String], required: true },
  correctIndex: { type: Number, required: true },
}, { _id: false });

const LessonSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  resourceUrl:  { type: String, required: true },
  resourceType: { type: String, enum: ['VIDEO', 'PDF', 'DOCUMENT'], default: 'PDF' },
}, { _id: false });

const MaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type:  { type: String, enum: ['VIDEO', 'PDF', 'DOCUMENT'], required: true },
  url:   { type: String, required: true },
}, { _id: false });

const TrainingSchema = new mongoose.Schema({
  title:               { type: String, required: true },
  description:         { type: String, required: true },
  targetPhase:         { type: String, enum: ['HLR', 'LLR', 'CODE', 'LLT', 'HLT'], required: true },
  durationWeeks:       { type: Number, default: 1 },
  quizDurationMinutes: { type: Number, default: 30 },
  passingScore:        { type: Number, default: 80 },
  materials:           { type: [MaterialSchema], default: [] },
  lessons:             { type: [LessonSchema], default: [] },
  quiz:                { type: [QuizQuestionSchema], default: [] },
}, { timestamps: true });

const Training = mongoose.model('Training', TrainingSchema);

// ─── Seed Data ───────────────────────────────────────────────────────────────

const formations = [
  {
    title: 'LLR',
    targetPhase: 'LLR',
    durationWeeks: 2,
    quizDurationMinutes: 30,
    passingScore: 80,
    description:
      'Maîtrisez la rédaction et la revue des Low Level Requirements (LLR) selon DO-178C. Ce module couvre les méthodes de traçabilité, la vérification des exigences et les bonnes pratiques pour la phase LLR dans les projets avioniques.',
    lessons: [
      {
        name: 'Introduction aux LLR et DO-178C',
        resourceUrl: 'https://smartpm.local/docs/llr-intro.pdf',
        resourceType: 'PDF',
      },
      {
        name: 'Traçabilité HLR → LLR',
        resourceUrl: 'https://smartpm.local/docs/llr-traceability.pdf',
        resourceType: 'PDF',
      },
      {
        name: 'Atelier : Revue de LLR',
        resourceUrl: 'https://smartpm.local/videos/llr-review-workshop.mp4',
        resourceType: 'VIDEO',
      },
      {
        name: 'Critères de conformité DO-178C §5.3',
        resourceUrl: 'https://smartpm.local/docs/do178c-section5.pdf',
        resourceType: 'PDF',
      },
    ],
    quiz: [
      {
        question: 'Que signifie LLR dans le contexte DO-178C ?',
        options: [
          'Low Level Requirements',
          'Low Level Review',
          'Logical Level Routing',
          'Linked Logic Requirements',
        ],
        correctIndex: 0,
      },
      {
        question: 'Quel niveau de criticité exige une couverture MCDC dans DO-178C ?',
        options: ['Niveau D', 'Niveau C', 'Niveau B', 'Niveau A'],
        correctIndex: 3,
      },
      {
        question: 'La traçabilité dans DO-178C doit être établie entre :',
        options: [
          'HLR → LLR uniquement',
          'LLR → Code source uniquement',
          'HLR → LLR → Code source → Tests',
          'Seulement entre les tests et le code',
        ],
        correctIndex: 2,
      },
      {
        question: 'Quelle activité de vérification est obligatoire pour les LLR en niveau A ?',
        options: [
          'Inspection informelle',
          'Revue par paires (peer review)',
          'Test unitaire seulement',
          'Aucune vérification requise',
        ],
        correctIndex: 1,
      },
      {
        question: "Un LLR doit être :",
        options: [
          'Vague pour permettre la flexibilité',
          'Précis, non-ambigu, vérifiable et traçable',
          'Uniquement lié au code source',
          'Rédigé uniquement en anglais technique',
        ],
        correctIndex: 1,
      },
      {
        question: 'Que doit contenir un plan de vérification des logiciels (SVP) ?',
        options: [
          'Uniquement les cas de test',
          'Les méthodes, critères de couverture et environnement de test',
          'La liste des développeurs assignés',
          'Le planning de livraison uniquement',
        ],
        correctIndex: 1,
      },
    ],
  },

  {
    title: 'LLT',
    targetPhase: 'LLT',
    durationWeeks: 3,
    quizDurationMinutes: 45,
    passingScore: 80,
    description:
      'Formation avancée sur les Low Level Tests (LLT) : tests unitaires, couverture MCDC, automatisation et intégration dans les pipelines CI/CD avioniques. Apprenez à concevoir et exécuter des campagnes de tests robustes conformes DO-178C.',
    lessons: [
      {
        name: 'Fondamentaux des tests unitaires DO-178C',
        resourceUrl: 'https://smartpm.local/docs/llt-unit-testing.pdf',
        resourceType: 'PDF',
      },
      {
        name: 'Critères de couverture : Statement, Decision, MCDC',
        resourceUrl: 'https://smartpm.local/docs/llt-coverage-criteria.pdf',
        resourceType: 'PDF',
      },
      {
        name: 'Atelier pratique : Écrire des tests MCDC avec LDRA',
        resourceUrl: 'https://smartpm.local/videos/llt-mcdc-workshop.mp4',
        resourceType: 'VIDEO',
      },
      {
        name: 'Gestion des données de test et stub/driver',
        resourceUrl: 'https://smartpm.local/docs/llt-stub-driver.pdf',
        resourceType: 'PDF',
      },
      {
        name: 'Rapport de couverture et non-conformités',
        resourceUrl: 'https://smartpm.local/docs/llt-coverage-report.pdf',
        resourceType: 'PDF',
      },
    ],
    quiz: [
      {
        question: 'Que mesure le critère MCDC (Modified Condition/Decision Coverage) ?',
        options: [
          "La couverture de chaque ligne de code",
          "Que chaque condition individuelle affecte indépendamment la décision globale",
          "Le nombre de branches testées",
          "La couverture des boucles",
        ],
        correctIndex: 1,
      },
      {
        question: 'Un "stub" dans le contexte des tests unitaires est :',
        options: [
          "Un rapport de test incomplet",
          "Un remplacement simplifié d'un module appelé",
          "Un script d'automatisation de tests",
          "Un outil de mesure de couverture",
        ],
        correctIndex: 1,
      },
      {
        question: 'Quel outil est couramment utilisé pour les tests unitaires DO-178C ?',
        options: [
          'Jest / Mocha',
          'LDRA Testbed ou VectorCAST',
          'Selenium WebDriver',
          'JUnit uniquement',
        ],
        correctIndex: 1,
      },
      {
        question: 'La couverture MCDC est obligatoire pour quel niveau DO-178C ?',
        options: ['Niveau D', 'Niveaux C et B', 'Niveau B seulement', 'Niveau A'],
        correctIndex: 3,
      },
      {
        question: 'Qu\'est-ce qu\'un "driver" dans les tests unitaires avioniques ?',
        options: [
          'Un développeur senior responsable des tests',
          'Un module simulant l\'appelant de l\'unité sous test',
          'Un rapport de résultat de test',
          'Une interface hardware de simulation',
        ],
        correctIndex: 1,
      },
      {
        question: 'Quelle est la différence entre un test "normal range" et "robustness" en LLT ?',
        options: [
          'Il n\'y a aucune différence',
          'Normal range teste les valeurs attendues, robustness teste les cas limites et invalides',
          'Robustness est uniquement pour le niveau D',
          'Normal range couvre uniquement les boucles',
        ],
        correctIndex: 1,
      },
      {
        question: 'Un rapport de couverture insatisfaisant doit être :',
        options: [
          'Ignoré si le planning est serré',
          'Documenté et justifié formellement ou corrigé par des tests supplémentaires',
          'Soumis directement au client',
          'Supprimé de la configuration',
        ],
        correctIndex: 1,
      },
    ],
  },

  {
    title: 'HLT',
    targetPhase: 'HLT',
    durationWeeks: 2,
    quizDurationMinutes: 40,
    passingScore: 80,
    description:
      "Module dédié aux High Level Tests (HLT) dans les projets avioniques. Apprenez à concevoir des campagnes de tests d'intégration et système, à valider les HLR, à gérer les anomalies et à préparer les dossiers de qualification DO-178C.",
    lessons: [
      {
        name: 'Introduction aux HLT et leur rôle dans DO-178C',
        resourceUrl: 'https://smartpm.local/docs/hlt-introduction.pdf',
        resourceType: 'PDF',
      },
      {
        name: 'Conception de cas de tests HLT à partir des HLR',
        resourceUrl: 'https://smartpm.local/docs/hlt-test-design.pdf',
        resourceType: 'PDF',
      },
      {
        name: "Gestion des anomalies et Problem Reports (PR)",
        resourceUrl: 'https://smartpm.local/docs/hlt-problem-reports.pdf',
        resourceType: 'PDF',
      },
      {
        name: 'Atelier : Exécution et validation d\'une campagne HLT',
        resourceUrl: 'https://smartpm.local/videos/hlt-campaign-workshop.mp4',
        resourceType: 'VIDEO',
      },
    ],
    quiz: [
      {
        question: 'Les High Level Tests (HLT) valident en priorité :',
        options: [
          'Les Low Level Requirements uniquement',
          'Les High Level Requirements (HLR) et le comportement système',
          'Le code source ligne par ligne',
          'La conformité MISRA-C',
        ],
        correctIndex: 1,
      },
      {
        question: 'Un Problem Report (PR) doit être ouvert lorsque :',
        options: [
          'Un test passe avec succès',
          'Une anomalie, un défaut ou un écart par rapport aux exigences est détecté',
          "Le planning est en retard",
          'Un nouveau membre rejoint l\'équipe',
        ],
        correctIndex: 1,
      },
      {
        question: 'La revue de test HLT doit vérifier que :',
        options: [
          "Tous les tests sont automatisés",
          "Chaque cas de test est tracé à au moins une HLR",
          "Le code source est 100% couvert",
          "Les tests durent moins de 10 minutes chacun",
        ],
        correctIndex: 1,
      },
      {
        question: "Qu'est-ce que le 'test environment configuration' en HLT ?",
        options: [
          'La liste des développeurs',
          "La définition précise du matériel, logiciels de support et outils utilisés pendant les tests",
          'La couleur des rapports de test',
          'Le nombre de testeurs dans l\'équipe',
        ],
        correctIndex: 1,
      },
      {
        question: 'Dans DO-178C, la traçabilité HLT doit couvrir :',
        options: [
          'HLR → Cas de test → Résultats de test',
          'Code → Tests uniquement',
          'LLR → HLT directement',
          'Aucune traçabilité requise pour HLT',
        ],
        correctIndex: 0,
      },
      {
        question: 'Quand considère-t-on une campagne HLT comme complète ?',
        options: [
          "Quand 50% des tests passent",
          "Quand tous les cas de test ont été exécutés, les PR ouverts résolus et la couverture HLR atteinte",
          "Quand le planning de livraison est dépassé",
          "Quand le chef de projet signe le document",
        ],
        correctIndex: 1,
      },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n🌱 Connecting to MongoDB: ${MONGO_URI}\n`);
  await mongoose.connect(MONGO_URI);

  let created = 0;
  let skipped = 0;

  for (const f of formations) {
    const existing = await Training.findOne({ title: f.title });
    if (existing) {
      // Update with full content (overwrite)
      await Training.findByIdAndUpdate(existing._id, {
        ...f,
      });
      console.log(`🔄 Updated : "${f.title}" (${f.quiz.length} questions, ${f.lessons.length} leçons)`);
      skipped++;
    } else {
      await Training.create(f);
      console.log(`✅ Créé    : "${f.title}" (${f.quiz.length} questions, ${f.lessons.length} leçons)`);
      created++;
    }
  }

  console.log(`\n✨ Terminé ! ${created} créé(s), ${skipped} mis à jour.\n`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
