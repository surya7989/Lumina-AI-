import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Clock, CheckCircle2, XCircle, Trophy, RefreshCw,
  ArrowLeft, BarChart3, Zap, Loader2, BookOpen,
} from 'lucide-react';
import StudentLayout from '../../components/layout/StudentLayout';
import AdminLayout from '../../components/layout/AdminLayout';
import useAuthStore from '../../store/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';

const categoryIcons = {
  math: Brain, science: Zap, english: Brain,
  history: BarChart3, tech: Zap, default: Brain,
};

export default function StudentQuiz() {
  const { user } = useAuthStore();
  const Layout = user?.role === 'student' ? StudentLayout : AdminLayout;
  const [view, setView] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchCategories();
    fetchHistory();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (view === 'in-progress' && quiz && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            handleSubmitQuiz();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, quiz, timer]);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/quiz/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/quiz/results');
      const list = Array.isArray(data) ? data : [];
      setHistory(list.map(r => ({
        id: r.id,
        date: r.completed_at || r.createdAt || r.date,
        category: r.category_name || (r.category ? (typeof r.category === 'object' ? r.category.name : r.category) : '-'),
        score: r.score,
        total: r.total_questions || r.total,
        percentage: r.percentage,
        timeTaken: r.time_taken || r.timeTaken || 0,
      })));
    } catch {}
  };

  const fetchLeaderboard = async () => {
    try {
      const { data } = await api.post('/quiz/leaderboard', {});
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleStartQuiz = async () => {
    if (!selectedCategory) return;
    setStarting(true);
    setError(null);
    try {
      const { data } = await api.post('/quiz/start', {
        categoryId: selectedCategory.id,
        numberOfQuestions: 10,
      });
      setQuiz(data);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setAnswers([]);
      setTimer(data.timeLimit || 600);
      setView('in-progress');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start quiz');
    } finally {
      setStarting(false);
    }
  };

  const handleSelectAnswer = (option) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;
    setAnswers((prev) => [
      ...prev,
      {
        questionId: quiz.questions[currentQuestion].id,
        selectedAnswer,
      },
    ]);
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((q) => q + 1);
      setSelectedAnswer(null);
    }
  };

  const handleSubmitQuiz = async () => {
    if (selectedAnswer !== null && currentQuestion < quiz.questions.length - 1) {
      setAnswers((prev) => [
        ...prev,
        {
          questionId: quiz.questions[currentQuestion].id,
          selectedAnswer,
        },
      ]);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const finalAnswers =
        selectedAnswer !== null
          ? [
              ...answers,
              {
                questionId: quiz.questions[currentQuestion].id,
                selectedAnswer,
              },
            ]
          : answers;

      const { data } = await api.post('/quiz/submit', {
        categoryId: selectedCategory.id,
        answers: finalAnswers,
        email: user?.email,
      });
      setResult(data);
      setView('results');
      fetchHistory();
      fetchLeaderboard();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTryAgain = () => {
    setQuiz(null); setCurrentQuestion(0); setSelectedAnswer(null);
    setAnswers([]); setTimer(0); setResult(null);
    setView('categories');
  };

  const handleBackToCategories = () => {
    setQuiz(null); setCurrentQuestion(0); setSelectedAnswer(null);
    setAnswers([]); setTimer(0); setResult(null); setSelectedCategory(null);
    setView('categories');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const qs = quiz?.questions || [];
  const progressPercent = qs.length > 0
    ? ((currentQuestion + (selectedAnswer !== null ? 1 : 0)) / qs.length) * 100 : 0;

  const currentQ = qs[currentQuestion];

  const historyColumns = [
    { key: 'date', label: 'Date', render: (val) => formatDate(val) },
    { key: 'category', label: 'Category' },
    { key: 'score', label: 'Score', render: (val, row) => `${val}/${row.total}` },
    { key: 'percentage', label: 'Percentage', render: (val) => `${Math.round(val)}%` },
    { key: 'timeTaken', label: 'Time Taken', render: (val) => val ? `${Math.floor(val / 60)}:${(val % 60).toString().padStart(2, '0')}` : '-' },
  ];

  const leaderboardColumns = [
    { key: 'rank', label: 'Rank', width: '60px', render: (val) => (
      <span className="font-bold text-white">#{val}</span>
    )},
    { key: 'name', label: 'Name' },
    { key: 'score', label: 'Score', render: (val, row) => `${val}/${row.total}` },
    { key: 'percentage', label: 'Percentage', render: (val) => `${Math.round(val)}%` },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Quiz Practice</h1>
            <p className="text-sm text-gray-400 mt-1">Test your knowledge across various subjects</p>
          </div>
          {view === 'categories' && (
            <Badge variant="default">{categories.length} categories</Badge>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center"
          >
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm font-medium">Dismiss</button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {view === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl" />
                  ))
                ) : categories.length === 0 ? (
                  <div className="col-span-full text-center py-16">
                    <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-300">No categories available</h3>
                  </div>
                ) : (
                  categories.map((cat, idx) => {
                    const Icon = categoryIcons[cat.name?.toLowerCase()] || Brain;
                    const isSelected = selectedCategory?.id === cat.id;
                    return (
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card
                          hover
                          className={`cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'ring-2 ring-white border-white/50'
                              : ''
                          }`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-white/10 p-2.5">
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-white truncate">{cat.name}</h3>
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{cat.description}</p>
                              <span className="text-xs text-gray-500 mt-1 block">
                                {cat.questionCount || 0} questions
                              </span>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {selectedCategory && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <Button onClick={handleStartQuiz} icon={Zap} size="lg" loading={starting}>
                    {starting ? 'Loading...' : `Start Quiz: ${selectedCategory.name}`}
                  </Button>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-semibold text-white">Quiz History</h3>
                  </div>
                  <Table
                    columns={historyColumns}
                    data={history}
                    emptyMessage="No quiz attempts yet"
                    pageSize={5}
                  />
                </Card>

                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
                  </div>
                  <Table
                    columns={leaderboardColumns}
                    data={leaderboard}
                    emptyMessage="No scores yet"
                    pageSize={5}
                    sortable={false}
                  />
                </Card>
              </div>
            </motion.div>
          )}

          {view === 'in-progress' && quiz && currentQ && (
            <motion.div
              key="in-progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/10 p-2.5">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedCategory?.name} Quiz</h2>
                    <p className="text-xs text-gray-400">Question {currentQuestion + 1} of {qs.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  <Clock className="w-4 h-4 text-white" />
                  <span className={`text-sm font-mono font-bold ${timer < 60 ? 'text-red-400' : 'text-gray-200'}`}>
                    {formatTime(timer)}
                  </span>
                </div>
              </div>

              {quiz.topics && quiz.topics.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <BookOpen className="w-3.5 h-3.5 text-white" />
                  {quiz.topics.map((t) => (
                    <Badge key={t} variant="default">{t}</Badge>
                  ))}
                </div>
              )}

              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full rounded-full bg-white"
                />
              </div>

              <Card className="text-center">
                {currentQ.topic && (
                  <div className="mb-3">
                    <Badge variant="default">{currentQ.topic}</Badge>
                  </div>
                )}
                <p className="text-xl font-medium text-white mb-6 leading-relaxed">
                  {currentQ.questionText}
                </p>
                <div className="space-y-3 max-w-xl mx-auto">
                  {currentQ.options.map((option, idx) => {
                    const labels = ['A', 'B', 'C', 'D'];
                    const isSelected = selectedAnswer === option;
                    return (
                      <motion.button
                        key={idx}
                        whileHover={selectedAnswer === null ? { scale: 1.01 } : {}}
                        whileTap={selectedAnswer === null ? { scale: 0.99 } : {}}
                        onClick={() => handleSelectAnswer(option)}
                        disabled={selectedAnswer !== null}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all duration-200 border ${
                          isSelected
                            ? 'border-white bg-white/20 text-white'
                            : selectedAnswer !== null
                            ? 'border-white/5 text-gray-400 opacity-50'
                            : 'border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? 'bg-white text-black'
                            : 'bg-white/5 text-gray-400'
                        }`}>
                          {labels[idx]}
                        </span>
                        {option}
                      </motion.button>
                    );
                  })}
                </div>
              </Card>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={handleBackToCategories} icon={ArrowLeft}>Quit</Button>
                {currentQuestion < qs.length - 1 ? (
                  <Button onClick={handleNextQuestion} disabled={selectedAnswer === null}>
                    Next Question
                  </Button>
                ) : (
                  <Button onClick={handleSubmitQuiz} disabled={selectedAnswer === null} loading={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {view === 'in-progress' && (!quiz || !currentQ) && !starting && (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 text-gray-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No questions available for this category yet. Generate some with AI from Quiz Management.</p>
              <Button onClick={handleBackToCategories} icon={ArrowLeft} className="mt-4">Back</Button>
            </div>
          )}

          {view === 'results' && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <Card className="text-center">
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg bg-white`}
                  >
                    {result.percentage >= 70 ? (
                      <Trophy className="w-9 h-9 text-black" />
                    ) : (
                      <Brain className="w-9 h-9 text-black" />
                    )}
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-1">Quiz Complete!</h2>
                  <p className="text-gray-400 text-sm mb-6">{selectedCategory?.name}</p>

                  <div className="flex items-center justify-center gap-8 mb-6">
                    <div>
                      <p className="text-4xl font-bold text-white">
                        {result.score}/{result.total}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Score</p>
                    </div>
                    <div className="w-px h-12 bg-white/10" />
                    <div>
                      <p className="text-4xl font-bold text-white">
                        {result.percentage}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Percentage</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      {result.correctCount ?? result.score} Correct
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm">
                      <XCircle className="w-4 h-4" />
                      {result.incorrectCount ?? (result.total - result.score)} Incorrect
                    </div>
                  </div>
                </div>
              </Card>

              {result.answers && (
                <Card>
                  <h3 className="text-lg font-semibold text-white mb-4">Question Review</h3>
                  <div className="space-y-4">
                    {result.answers.map((ans, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${
                          ans.isCorrect
                            ? 'border-white/20 bg-white/5'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                            ans.isCorrect ? 'bg-white/20 text-white' : 'bg-white/10 text-white'
                          }`}>
                            {ans.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 mb-2">{ans.questionText || `Question ${idx + 1}`}</p>
                            <div className="text-xs space-y-1">
                              <p className="text-gray-400">
                                Your answer: <span className={ans.isCorrect ? 'text-white' : 'text-red-400'}>{ans.selectedAnswer}</span>
                              </p>
                              {!ans.isCorrect && (
                                <p className="text-gray-400">
                                  Correct answer: <span className="text-white">{ans.correctAnswer}</span>
                                </p>
                              )}
                            </div>
                            {ans.explanation && (
                              <p className="text-xs text-gray-500 mt-1 italic">{ans.explanation}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="flex items-center justify-center gap-3">
                <Button variant="secondary" onClick={handleTryAgain} icon={RefreshCw}>Try Again</Button>
                <Button onClick={handleBackToCategories} icon={ArrowLeft}>Back to Categories</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
