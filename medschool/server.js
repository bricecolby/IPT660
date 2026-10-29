const express = require('express');
const Database = require('better-sqlite3');
const path = require('node:path');

const app = express();
const db = new Database(path.join(__dirname, 'medschool.db'));
const PORT = process.env.PORT || 3000;
const DEMO_LEARNER = 'demo-student';
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function questionForClient(row) {
  return { id: row.id, conceptId: row.concept_id, prompt: row.prompt, options: JSON.parse(row.options) };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'sqlite' }));
app.get('/api/standards', (_req, res) => {
  res.json(db.prepare(`SELECT s.*, COUNT(c.id) AS conceptCount FROM standards s LEFT JOIN concepts c ON c.standard_id=s.id GROUP BY s.id`).all());
});
app.get('/api/concepts', (req, res) => {
  const rows = req.query.standardId
    ? db.prepare('SELECT * FROM concepts WHERE standard_id=? ORDER BY id').all(req.query.standardId)
    : db.prepare('SELECT * FROM concepts ORDER BY id').all();
  res.json(rows.map(row => ({
    ...row,
    learningObjectives: JSON.parse(row.learning_objectives),
    keyTerms: JSON.parse(row.key_terms)
  })));
});
app.get('/api/concepts/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM concepts WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Concept not found' });
  res.json({ ...row, learningObjectives: JSON.parse(row.learning_objectives), keyTerms: JSON.parse(row.key_terms) });
});
app.get('/api/questions', (req, res) => {
  const rows = req.query.conceptId
    ? db.prepare('SELECT * FROM questions WHERE concept_id=? ORDER BY id').all(req.query.conceptId)
    : db.prepare('SELECT * FROM questions ORDER BY id').all();
  res.json(rows.map(questionForClient));
});
app.get('/api/practice/next', (_req, res) => {
  const row = db.prepare(`SELECT q.* FROM questions q LEFT JOIN mastery m ON m.concept_id=q.concept_id AND m.learner_id=? ORDER BY COALESCE(1.0*m.correct/NULLIF(m.attempted,0),0) ASC, RANDOM() LIMIT 1`).get(DEMO_LEARNER);
  res.json(row ? questionForClient(row) : null);
});
app.post('/api/answers', (req, res) => {
  const { questionId, selectedOption } = req.body || {};
  if (typeof questionId !== 'string' || !Number.isInteger(selectedOption)) return res.status(400).json({ error: 'questionId and integer selectedOption are required' });
  const question = db.prepare('SELECT * FROM questions WHERE id=?').get(questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  const correct = selectedOption === question.correct_option;
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO answers (learner_id,question_id,selected_option,is_correct) VALUES (?,?,?,?)').run(DEMO_LEARNER, questionId, selectedOption, Number(correct));
    db.prepare(`INSERT INTO mastery (learner_id,concept_id,correct,attempted) VALUES (?,?,?,1) ON CONFLICT(learner_id,concept_id) DO UPDATE SET correct=correct+excluded.correct, attempted=attempted+1, updated_at=CURRENT_TIMESTAMP`).run(DEMO_LEARNER, question.concept_id, Number(correct));
  });
  tx();
  res.json({ correct, correctOption: question.correct_option, feedback: correct ? 'Correct!' : question.explanation, explanation: question.explanation });
});
app.get('/api/progress', (_req, res) => {
  res.json(db.prepare(`SELECT c.id AS conceptId,c.title AS concept,s.id AS standardId,s.title AS standard,COALESCE(m.correct,0) AS correct,COALESCE(m.attempted,0) AS attempted,CASE WHEN COALESCE(m.attempted,0)=0 THEN 0 ELSE ROUND(100.0*m.correct/m.attempted) END AS masteryPercent FROM concepts c JOIN standards s ON s.id=c.standard_id LEFT JOIN mastery m ON m.concept_id=c.id AND m.learner_id=? ORDER BY s.id,c.id`).all(DEMO_LEARNER));
});
app.get('/api/dashboard', (_req, res) => {
  const summary = db.prepare('SELECT COUNT(*) AS attempted, COALESCE(SUM(is_correct),0) AS correct FROM answers WHERE learner_id=?').get(DEMO_LEARNER);
  const progress = db.prepare('SELECT COUNT(*) AS concepts, COALESCE(SUM(CASE WHEN attempted>0 AND 1.0*correct/attempted>=0.8 THEN 1 ELSE 0 END),0) AS mastered FROM mastery WHERE learner_id=?').get(DEMO_LEARNER);
  res.json({ learnerId: DEMO_LEARNER, ...summary, ...progress });
});

app.get('/api/standards/progress', (_req, res) => {
  res.json(db.prepare(`SELECT s.id AS standardId,s.title,s.description,s.threshold,
    COUNT(c.id) AS conceptCount,
    SUM(CASE WHEN COALESCE(m.attempted,0)>0 AND 1.0*m.correct/m.attempted>=s.threshold THEN 1 ELSE 0 END) AS mastered,
    ROUND(AVG(CASE WHEN COALESCE(m.attempted,0)=0 THEN 0 ELSE 100.0*m.correct/m.attempted END)) AS masteryPercent
    FROM standards s JOIN concepts c ON c.standard_id=s.id
    LEFT JOIN mastery m ON m.concept_id=c.id AND m.learner_id=?
    GROUP BY s.id ORDER BY s.id`).all(DEMO_LEARNER));
});

app.listen(PORT, () => console.log(`Med school review API listening at http://localhost:${PORT}`));
