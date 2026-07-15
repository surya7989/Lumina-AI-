import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  HelpCircle,
  BarChart3,
  X,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';

const tabs = [
  { key: 'categories', label: 'Categories', icon: Layers },
  { key: 'questions', label: 'Questions', icon: HelpCircle },
  { key: 'results', label: 'Results', icon: BarChart3 },
];

const difficulties = ['easy', 'medium', 'hard'];

export default function AdminQuiz() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white">Quiz Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage categories, questions, and view results</p>
        </motion.div>

        <Card padding="none" className="overflow-hidden">
          <div className="flex border-b border-white/10">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
                  activeTab === tab.key
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div layoutId="quiz-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
            ))}
          </div>
        </Card>

        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'questions' && <QuestionsTab />}
        {activeTab === 'results' && <ResultsTab />}
      </div>
    </AdminLayout>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [name, setName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/quiz/categories');
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editing) {
        const { data } = await api.put(`/quiz/categories/${editing._id || editing.id}`, { name });
        setCategories(prev => prev.map(c => (c._id || c.id) === (editing._id || editing.id) ? (data.category || data) : c));
      } else {
        const { data } = await api.post('/quiz/categories', { name });
        setCategories(prev => [...prev, data.category || data]);
      }
      setShowModal(false);
      setEditing(null);
      setName('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (cat) => {
    try {
      await api.delete(`/quiz/categories/${cat._id || cat.id}`);
      setCategories(prev => prev.filter(c => (c._id || c.id) !== (cat._id || cat.id)));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setName(cat.name);
    setShowModal(true);
  };

  if (loading) return <Card><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div></Card>;

  return (
    <>
      {error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center mb-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={fetchCategories} className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 text-sm font-medium hover:bg-white/20 transition-colors">Retry</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{categories.length} categories</p>
        <Button size="sm" icon={Plus} onClick={() => { setEditing(null); setName(''); setShowModal(true); }}>Add Category</Button>
      </div>
      <Card padding="none" className="overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No categories yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {categories.map((cat, idx) => (
              <motion.div
                key={cat._id || cat.id || idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/10 p-2">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-200">{cat.name}</span>
                  <Badge variant="default">{cat.questionCount || 0} questions</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirm(cat)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Category Name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all"
              placeholder="e.g. Mathematics"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={formLoading} className="flex-1">{editing ? 'Update' : 'Create'}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Category" size="sm">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-gray-300">Delete <span className="font-semibold text-white">{deleteConfirm?.name}</span>?</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)} className="flex-1">Delete</Button>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function QuestionsTab() {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    questionText: '', options: ['', '', '', ''], correctAnswer: 0,
    category: '', difficulty: 'medium', explanation: '', topic: '',
  });
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [aiForm, setAiForm] = useState({ category: '', topic: '', difficulty: 'mixed', count: 5 });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    Promise.all([fetchQuestions(), fetchCategories()]);
  }, []);

  const handleAIGenerate = async (e) => {
    e.preventDefault();
    setAiGenerating(true);
    setAiResult(null);
    try {
      const { data } = await api.post('/quiz/ai-generate', {
        categoryId: aiForm.category,
        categoryName: categories.find(c => (c._id || c.id) === aiForm.category)?.name || '',
        count: aiForm.count,
        difficulty: aiForm.difficulty,
        topic: aiForm.topic,
      });
      setAiResult(data);
      setAiForm({ category: '', topic: '', difficulty: 'mixed', count: 5 });
      setTimeout(() => setShowAIGenerate(false), 2000);
      fetchQuestions();
    } catch (err) {
      setAiResult({ error: err.response?.data?.message || err.message || 'Failed to generate questions' });
    } finally {
      setAiGenerating(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const { data } = await api.get('/quiz/questions');
      setQuestions(Array.isArray(data) ? data : data.questions || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/quiz/categories');
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch {}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        questionText: form.questionText,
        options: form.options,
        correctAnswer: Number(form.correctAnswer),
        category: form.category,
        difficulty: form.difficulty,
        explanation: form.explanation,
        topic: form.topic || undefined,
      };
      if (editing) {
        const { data } = await api.put(`/quiz/questions/${editing._id || editing.id}`, payload);
        setQuestions(prev => prev.map(q => (q._id || q.id) === (editing._id || editing.id) ? (data.question || data) : q));
      } else {
        const { data } = await api.post('/quiz/questions', payload);
        setQuestions(prev => [...prev, data.question || data]);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ questionText: '', options: ['', '', '', ''], correctAnswer: 0, category: '', difficulty: 'medium', explanation: '', topic: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save question');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (q) => {
    try {
      await api.delete(`/quiz/questions/${q._id || q.id}`);
      setQuestions(prev => prev.filter(x => (x._id || x.id) !== (q._id || q.id)));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const openEdit = (q) => {
    setEditing(q);
    setForm({
      questionText: q.questionText || '',
      options: q.options?.length === 4 ? [...q.options] : ['', '', '', ''],
      correctAnswer: q.correctAnswer ?? 0,
      category: q.category?._id || q.category || q.categoryId || '',
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation || '',
      topic: q.topic || '',
    });
    setShowModal(true);
  };

  if (loading) return <Card><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div></Card>;

  return (
    <>
      {error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center mb-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={fetchQuestions} className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 text-sm font-medium hover:bg-white/20 transition-colors">Retry</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{questions.length} questions</p>
        <div className="flex items-center gap-2">
          <Button size="sm" icon={Sparkles} variant="secondary" onClick={() => setShowAIGenerate(true)}>
            AI Generate
          </Button>
          <Button size="sm" icon={Plus} onClick={() => { setEditing(null); setForm({ questionText: '', options: ['', '', '', ''], correctAnswer: 0, category: categories[0]?._id || categories[0]?.id || '', difficulty: 'medium', explanation: '', topic: '' }); setShowModal(true); }}>Add Question</Button>
        </div>
      </div>
      <Card padding="none" className="overflow-hidden">
        {questions.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No questions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Topic</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Difficulty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {questions.map((q, idx) => (
                  <motion.tr
                    key={q._id || q.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-200 max-w-xs truncate">{q.questionText}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{categories.find(c => (c.id === (q.categoryId || q.category)))?.name || q.categoryName || 'Uncategorized'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {q.topic ? <Badge variant="default">{q.topic}</Badge> : <span className="text-gray-500 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">
                        {q.difficulty || 'medium'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(q)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Question' : 'Add Question'} size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Question Text</label>
            <textarea
              required
              value={form.questionText}
              onChange={e => setForm(p => ({ ...p, questionText: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all resize-none"
              placeholder="What is 2 + 2?"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {form.options.map((opt, i) => (
              <div key={i}>
                <label className="block text-xs font-medium text-gray-400 mb-1">Option {i + 1}</label>
                <input
                  required
                  value={opt}
                  onChange={e => {
                    const opts = [...form.options];
                    opts[i] = e.target.value;
                    setForm(p => ({ ...p, options: opts }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
                  placeholder={`Option ${i + 1}`}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Correct Answer</label>
              <select
                value={form.correctAnswer}
                onChange={e => setForm(p => ({ ...p, correctAnswer: Number(e.target.value) }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
              >
                {form.options.map((_, i) => (
                  <option key={i} value={i}>Option {i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
              <select
                required
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
              >
                {difficulties.map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Explanation (optional)</label>
            <textarea
              value={form.explanation}
              onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all resize-none"
              placeholder="Explain the correct answer..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Topic (optional)</label>
            <input
              value={form.topic}
              onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
              placeholder="e.g. Algebra, World War II, Grammar"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={formLoading} className="flex-1">{editing ? 'Update Question' : 'Add Question'}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Question" size="sm">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-gray-300">Delete this question?</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)} className="flex-1">Delete</Button>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAIGenerate} onClose={() => { setShowAIGenerate(false); setAiResult(null); }} title="AI Generate Questions" size="md">
        {aiResult ? (
          <div className="text-center space-y-4 py-4">
            {aiResult.error ? (
              <>
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                <p className="text-red-400 text-sm">{aiResult.error}</p>
              </>
            ) : (
              <>
                <Check className="w-12 h-12 text-white mx-auto" />
                <p className="text-gray-200 font-medium">Questions Generated!</p>
                <p className="text-sm text-gray-400">{aiResult.generated?.length || 0} questions created ({aiResult.saved || 0} saved)</p>
              </>
            )}
            <Button onClick={() => { setShowAIGenerate(false); setAiResult(null); }}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleAIGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
              <select
                required
                value={aiForm.category}
                onChange={e => setAiForm(p => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Topic / Focus (optional)</label>
              <input
                value={aiForm.topic}
                onChange={e => setAiForm(p => ({ ...p, topic: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
                placeholder="e.g. Algebra, World War II, Grammar rules..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Difficulty</label>
                <select
                  value={aiForm.difficulty}
                  onChange={e => setAiForm(p => ({ ...p, difficulty: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
                >
                  <option value="mixed">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Number of Questions</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={aiForm.count}
                  onChange={e => setAiForm(p => ({ ...p, count: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={aiGenerating} icon={Sparkles} className="flex-1">
                {aiGenerating ? 'Generating...' : 'Generate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowAIGenerate(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function ResultsTab() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/quiz/results');
      setResults(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Card><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div></Card>;

  return (
    <>
      {error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center mb-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={fetchResults} className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 text-sm font-medium hover:bg-white/20 transition-colors">Retry</button>
        </div>
      )}
      <Card padding="none" className="overflow-hidden">
        {results.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No quiz results yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Student', 'Category', 'Score', 'Percentage', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map((r, idx) => (
                  <motion.tr
                    key={r._id || r.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-200">
                      {typeof r.student === 'object' ? r.student?.name : r.studentName || r.student || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{typeof r.category === 'object' ? r.category?.name : r.category || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3">{r.score}/{r.totalQuestions || r.total}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default">
                        {Math.round(r.percentage)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.createdAt || r.date)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
