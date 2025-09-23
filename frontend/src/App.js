import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Login Component
const Login = ({ onLogin, setUserType }) => {
  const [studentCode, setStudentCode] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    if (!studentCode.trim()) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('code', studentCode);
      
      const response = await axios.post(`${API}/auth/student`, formData);
      if (response.data.success) {
        onLogin(response.data.student);
        setUserType('student');
        toast.success(`Hoş geldin ${response.data.student.name}! 🎉`);
      }
    } catch (error) {
      toast.error('Öğrenci bulunamadı! Kodunu kontrol et. 📝');
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/admin`, {
        password: adminPassword
      });
      if (response.data.success) {
        onLogin({ isAdmin: true });
        setUserType('admin');
        toast.success('Admin girişi başarılı! 🔐');
      }
    } catch (error) {
      toast.error('Yanlış admin şifresi! 🚫');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">📚 5 Kutu Yöntemi</h1>
          <p className="text-gray-600">Kelime Öğrenme Sistemi</p>
        </div>

        <div className="flex space-x-2 mb-6">
          <Button 
            variant={!isAdmin ? "default" : "outline"} 
            onClick={() => setIsAdmin(false)}
            className="flex-1"
            data-testid="student-tab"
          >
            👨‍🎓 Öğrenci Girişi
          </Button>
          <Button 
            variant={isAdmin ? "default" : "outline"} 
            onClick={() => setIsAdmin(true)}
            className="flex-1"
            data-testid="admin-tab"
          >
            🔐 Admin Girişi
          </Button>
        </div>

        {!isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Öğrenci Girişi</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Öğrenci Kodun (örn: 9011)"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="text-center text-lg"
                  data-testid="student-code-input"
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !studentCode.trim()}
                  data-testid="student-login-btn"
                >
                  {loading ? '⏳ Giriş yapılıyor...' : '🚀 Giriş Yap'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Admin Girişi</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <Input
                  type="password"
                  placeholder="Admin şifresi"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="text-center"
                  data-testid="admin-password-input"
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !adminPassword.trim()}
                  data-testid="admin-login-btn"
                >
                  {loading ? '⏳ Kontrol ediliyor...' : '🔐 Admin Girişi'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <footer className="text-center text-sm text-gray-500 mt-8">
          Prepared by Murat Develi | 📱 zoom_ingilizce
        </footer>
      </div>
    </div>
  );
};

// Student Dashboard Component
const StudentDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/student/${user.code}/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('İstatistikler yüklenemedi! 📊');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">👋 Hoş geldin, {user.name}!</h1>
            <p className="text-gray-600">Kod: {user.code} | Sınıf: {user.class_level}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onLogout} data-testid="logout-btn">
              🚪 Çıkış
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-lg">📚 Toplam Kelime</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-blue-600" data-testid="total-words">
                {stats?.total_words || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-lg">✅ Bugün Çalıştığın</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-green-600" data-testid="words-studied-today">
                {stats?.words_studied_today || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-lg">🎯 Çalışman Gereken</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-orange-600" data-testid="next-study-words">
                {stats?.next_study_words || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Box Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">📦 Kutu Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map(box => {
              const count = stats?.box_distribution[`box_${box}`] || 0;
              const total = stats?.total_words || 1;
              const percentage = (count / total) * 100;
              
              return (
                <div key={box} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">📦 Kutu {box}</span>
                    <Badge variant="secondary" data-testid={`box-${box}-count`}>
                      {count} kelime
                    </Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            className="h-16 text-lg"
            onClick={() => navigate('/study')}
            disabled={!stats?.next_study_words}
            data-testid="start-study-btn"
          >
            {stats?.next_study_words ? '🚀 Kelime Çalışmaya Başla' : '🎉 Bugünlük Tamamlandı!'}
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 text-lg"
            onClick={() => navigate('/words')}
            data-testid="view-words-btn"
          >
            📖 Tüm Kelimeleri Gör
          </Button>
        </div>

        <footer className="text-center text-sm text-gray-500 mt-8">
          Prepared by Murat Develi | 📱 zoom_ingilizce
        </footer>
      </div>
    </div>
  );
};

// Study Component
const StudyPage = ({ user, onLogout }) => {
  const [currentWord, setCurrentWord] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNextWord();
  }, []);

  const fetchNextWord = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/study/${user.code}/next-word`);
      if (response.data.completed) {
        setCompleted(true);
      } else {
        setCurrentWord(response.data);
        setFeedback(null);
        setAnswer('');
      }
    } catch (error) {
      toast.error('Kelime yüklenemedi! 📝');
    }
    setLoading(false);
  };

  const submitAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    try {
      const response = await axios.post(`${API}/study/answer`, {
        student_code: user.code,
        word_id: currentWord.word_id,
        answer: answer.trim(),
        is_correct: false // Will be determined by backend
      });

      setFeedback(response.data);
      
      if (response.data.is_correct) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Cevap gönderilemedi! 📤');
    }
  };

  const nextWord = () => {
    fetchNextWord();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Kelime hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="text-6xl mb-4">🎉</div>
            <CardTitle className="text-2xl">Tebrikler!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg text-gray-600">Bugünlük çalışman tamamlandı!</p>
            <p className="text-sm text-gray-500">Yarın yeni kelimelerle tekrar gel! 📚</p>
            
            <div className="space-y-2 pt-4">
              <Button onClick={() => window.location.href = '/'} className="w-full" data-testid="dashboard-btn">
                🏠 Ana Sayfaya Dön
              </Button>
              <Button variant="outline" onClick={onLogout} className="w-full" data-testid="logout-btn">
                🚪 Çıkış Yap
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📚 Kelime Çalışması</h1>
            <p className="text-sm text-gray-600">Kutu {currentWord?.current_box} | Kalan: {currentWord?.remaining_words}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/'} data-testid="dashboard-btn">
              🏠 Ana Sayfa
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} data-testid="logout-btn">
              🚪 Çıkış
            </Button>
          </div>
        </div>

        {/* Study Card */}
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-600" data-testid="english-word">
              {currentWord?.english}
            </CardTitle>
            <p className="text-gray-500">Bu kelimenin Türkçe anlamını yaz</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!feedback ? (
              <form onSubmit={submitAnswer} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Türkçe anlamını buraya yaz..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="text-center text-lg"
                  data-testid="answer-input"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!answer.trim()}
                  data-testid="submit-answer-btn"
                >
                  ✅ Cevabı Gönder
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className={`text-xl font-bold ${feedback.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                  {feedback.is_correct ? '✅ Doğru!' : '❌ Yanlış!'}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Doğru cevaplar:</p>
                  <div className="space-y-1">
                    {feedback.correct_answers.map((meaning, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {meaning}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-lg font-medium text-blue-600" data-testid="feedback-message">
                  {feedback.message}
                </div>

                <Button onClick={nextWord} className="w-full" data-testid="next-word-btn">
                  ➡️ Sonraki Kelime
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="text-center text-sm text-gray-500 mt-8">
          Prepared by Murat Develi | 📱 zoom_ingilizce
        </footer>
      </div>
    </div>
  );
};

// Words List Component
const WordsList = ({ user, onLogout }) => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      const response = await axios.get(`${API}/student/${user.code}/words`);
      setWords(response.data);
    } catch (error) {
      toast.error('Kelimeler yüklenemedi! 📚');
    }
    setLoading(false);
  };

  const getBoxColor = (box) => {
    const colors = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-blue-100 text-blue-800',
      5: 'bg-green-100 text-green-800'
    };
    return colors[box] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Kelimeler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📖 Tüm Kelimelerim</h1>
            <p className="text-gray-600">Toplam {words.length} kelime</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/'} data-testid="dashboard-btn">
              🏠 Ana Sayfa
            </Button>
            <Button variant="outline" onClick={onLogout} data-testid="logout-btn">
              🚪 Çıkış
            </Button>
          </div>
        </div>

        {/* Words by Box */}
        {[1, 2, 3, 4, 5].map(box => {
          const boxWords = words.filter(word => word.box === box);
          
          return (
            <Card key={box}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>📦 Kutu {box}</span>
                  <Badge variant="secondary">{boxWords.length} kelime</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {boxWords.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Bu kutuda henüz kelime yok</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {boxWords.map((word, index) => (
                      <div key={word.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium text-blue-600 mb-1">
                          {word.english}
                        </div>
                        <div className="text-sm text-gray-600">
                          {word.turkish_meanings.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <footer className="text-center text-sm text-gray-500 mt-8">
          Prepared by Murat Develi | 📱 zoom_ingilizce
        </footer>
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = ({ onLogout }) => {
  const [studentsFile, setStudentsFile] = useState(null);
  const [wordsFile, setWordsFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleStudentUpload = async (e) => {
    e.preventDefault();
    if (!studentsFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', studentsFile);

    try {
      const response = await axios.post(`${API}/admin/upload-students`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`✅ ${response.data.students_added} öğrenci eklendi, ${response.data.students_updated} güncellendi!`);
      setStudentsFile(null);
    } catch (error) {
      toast.error('Öğrenci dosyası yüklenemedi! 📄');
    }
    setUploading(false);
  };

  const handleWordsUpload = async (e) => {
    e.preventDefault();
    if (!wordsFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', wordsFile);

    try {
      const response = await axios.post(`${API}/admin/upload-words`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`✅ ${response.data.words_added} kelime eklendi!`);
      setWordsFile(null);
    } catch (error) {
      toast.error('Kelime dosyası yüklenemedi! 📚');
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔐 Admin Paneli</h1>
            <p className="text-gray-600">Sistem yönetimi</p>
          </div>
          <Button variant="outline" onClick={onLogout} data-testid="admin-logout-btn">
            🚪 Çıkış
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Upload */}
          <Card>
            <CardHeader>
              <CardTitle>👨‍🎓 Öğrenci Yükleme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  CSV formatı: code,name,class<br/>
                  Örnek: 9011,Ali ARIKAN,9
                </p>
                
                <form onSubmit={handleStudentUpload} className="space-y-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setStudentsFile(e.target.files[0])}
                    data-testid="students-file-input"
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!studentsFile || uploading}
                    data-testid="upload-students-btn"
                  >
                    {uploading ? '⏳ Yükleniyor...' : '📤 Öğrencileri Yükle'}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Words Upload */}
          <Card>
            <CardHeader>
              <CardTitle>📚 Kelime Yükleme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  CSV formatı: class,english,turkish<br/>
                  Örnek: 9,play,oynamak;çalmak
                </p>
                
                <form onSubmit={handleWordsUpload} className="space-y-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setWordsFile(e.target.files[0])}
                    data-testid="words-file-input"
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!wordsFile || uploading}
                    data-testid="upload-words-btn"
                  >
                    {uploading ? '⏳ Yükleniyor...' : '📤 Kelimeleri Yükle'}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="text-center text-sm text-gray-500 mt-8">
          Prepared by Murat Develi | 📱 zoom_ingilizce
        </footer>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'student' or 'admin'

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setUserType(null);
    toast.info('Çıkış yapıldı! 👋');
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              !user ? (
                <Login onLogin={handleLogin} setUserType={setUserType} />
              ) : userType === 'admin' ? (
                <AdminPanel onLogout={handleLogout} />
              ) : (
                <StudentDashboard user={user} onLogout={handleLogout} />
              )
            } 
          />
          <Route 
            path="/study" 
            element={
              !user || userType !== 'student' ? (
                <Navigate to="/" />
              ) : (
                <StudyPage user={user} onLogout={handleLogout} />
              )
            } 
          />
          <Route 
            path="/words" 
            element={
              !user || userType !== 'student' ? (
                <Navigate to="/" />
              ) : (
                <WordsList user={user} onLogout={handleLogout} />
              )
            } 
          />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;