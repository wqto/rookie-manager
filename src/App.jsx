import React, { useState, useEffect, useMemo } from 'react';
import { Users, Calendar, Clock, Plus, MessageSquare, Search, ChevronRight, X, Save, Trash2, ListFilter, ChevronLeft, UserPlus, CalendarDays, History, Loader2, AlertCircle, Edit2, Check, Bell, Zap, Briefcase, Activity, ArrowUp, ArrowDown, TrendingUp, StickyNote, PenTool, GripVertical, ArrowUpCircle, ArrowDownCircle, CheckCircle2 } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- Firebase 設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyAo-6eLSm2fNk3h1U3GKVCRY3llM_JP-14",
  authDomain: "rookie-app-2850d.firebaseapp.com",
  projectId: "rookie-app-2850d",
  storageBucket: "rookie-app-2850d.firebasestorage.app",
  messagingSenderId: "806570495713",
  appId: "1:806570495713:web:6e15d699a5eff85a98b1a0",
  measurementId: "G-RGDPVZD7GK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'rookie_manager_shared'; 

// --- ヘルパー関数 ---

const getDaysDiff = (dateString) => {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const [y, m, d] = dateString.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d); 
  const diffTime = today - targetDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return "";
  try {
    let d;
    if (timestamp.toDate) {
      d = timestamp.toDate();
    } else if (timestamp.seconds) {
      d = new Date(timestamp.seconds * 1000);
    } else {
      d = new Date(timestamp);
    }
    return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "";
  }
};

// --- サブコンポーネント: 案件カード ---
const ProjectCard = ({ item, onClick }) => {
  if (!item) return null;

  const getRankStyle = (rank) => {
    switch(rank) {
      case 'high': return "bg-red-50 border-red-200 shadow-red-100";
      case 'medium': return "bg-indigo-50 border-indigo-200 shadow-indigo-100";
      case 'low': 
      default: return "bg-white border-slate-200 shadow-slate-100";
    }
  };

  const getRankLabel = (rank) => {
    switch(rank) {
      case 'high': return { text: "高", color: "text-red-600 bg-red-100 border-red-200" };
      case 'medium': return { text: "中", color: "text-indigo-600 bg-indigo-100 border-indigo-200" };
      case 'low': return { text: "低", color: "text-slate-500 bg-slate-100 border-slate-200" };
      default: return null;
    }
  };

  const rankStyle = getRankStyle(item.projectRank);
  const rankLabel = getRankLabel(item.projectRank);

  return (
    <div 
      onClick={() => onClick && onClick(item)}
      className={`${rankStyle} border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group break-words flex flex-col h-full`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-slate-800 line-clamp-1 flex items-center gap-1 text-sm">
          <Users size={12} className="text-slate-500 flex-shrink-0"/>
          {item.name}
        </h3>
        {rankLabel && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${rankLabel.color}`}>
            {rankLabel.text}
          </span>
        )}
      </div>
      <div className="flex-1">
        {item.currentProject ? (
          <p className="text-xs text-slate-700 whitespace-pre-wrap">{item.currentProject}</p>
        ) : (
          <p className="text-xs text-slate-400 italic">案件情報なし</p>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-black/5 flex justify-between items-center text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar size={10} className="text-slate-400"/> 
          営業日: <span className="font-bold">{item.projectDate || "未設定"}</span>
        </span>
        {onClick && <Edit2 size={10} className="opacity-50" />}
      </div>
    </div>
  );
};

// --- サブコンポーネント: メモカード（リスト形式・並び替え対応） ---
const MemoListItem = ({ item, isReordering, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, onDelete }) => {
  const isEvent = item.type === 'event';

  const getRankBadge = (rank) => {
    switch(rank) {
      case 'high': return <span className="bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold">高</span>;
      case 'medium': return <span className="bg-indigo-100 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold">中</span>;
      case 'low': return <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">低</span>;
      default: return null;
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg border shadow-sm mb-2 transition-all relative group ${isEvent ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'} ${isReordering ? 'border-dashed border-slate-400 opacity-90' : ''}`}
      draggable={isReordering}
      onDragStart={isReordering ? (e) => onDragStart(e, item.id) : null}
      onDragOver={isReordering ? onDragOver : null}
      onDrop={isReordering ? (e) => onDrop(e, item.id) : null}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          {/* 並び替えモード時のハンドル（PC用） */}
          {isReordering && <GripVertical size={16} className="text-slate-400 cursor-grab" />}
          
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1">
            {isEvent ? <PenTool size={12} className="text-green-600"/> : <Users size={12} className="text-slate-400"/>}
            {item.name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] text-slate-500 font-mono">{item.displayDate}</span>
           {getRankBadge(item.rank)}
           
           {/* 並び替えモード時のボタン（スマホ用） */}
           {isReordering && (
             <div className="flex gap-1 ml-2">
               <button onClick={() => onMoveUp(item.id)} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded"><ArrowUp size={14}/></button>
               <button onClick={() => onMoveDown(item.id)} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded"><ArrowDown size={14}/></button>
             </div>
           )}
        </div>
      </div>
      <div className="pl-4 border-l-2 border-slate-200 ml-1 pr-6">
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {typeof item.content === 'string' ? item.content : <span className="text-slate-400 italic">内容なし</span>}
        </p>
      </div>

      {/* 削除ボタン: イベントの場合のみ表示 */}
      {isEvent && !isReordering && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

// --- サブコンポーネント: 案件編集モーダル ---
const ProjectEditModal = ({ isOpen, onClose, rookie, onSave }) => {
  const [content, setContent] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [projectRank, setProjectRank] = useState("low");

  useEffect(() => {
    if (rookie) {
      setContent(rookie.currentProject || "");
      setProjectDate(rookie.projectDate || ""); 
      setProjectRank(rookie.projectRank || "low");
    }
  }, [rookie, isOpen]);

  if (!isOpen || !rookie) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(rookie.id, content, projectDate, projectRank);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 text-left">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[70vh] sm:w-full sm:max-w-md sm:rounded-xl shadow-2xl p-6 relative z-10 flex flex-col animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs text-slate-500 font-bold">案件情報の編集</span>
            <h2 className="text-lg font-bold text-slate-800">{rookie.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-indigo-700 mb-2">優先度・評価</label>
            <div className="flex gap-2">
              <label className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-colors ${projectRank === 'high' ? 'bg-red-100 border-red-500 text-red-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <input type="radio" name="rank" value="high" checked={projectRank === 'high'} onChange={(e) => setProjectRank(e.target.value)} className="hidden" />
                高
              </label>
              <label className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-colors ${projectRank === 'medium' ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <input type="radio" name="rank" value="medium" checked={projectRank === 'medium'} onChange={(e) => setProjectRank(e.target.value)} className="hidden" />
                中
              </label>
              <label className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-colors ${projectRank === 'low' ? 'bg-slate-100 border-slate-500 text-slate-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <input type="radio" name="rank" value="low" checked={projectRank === 'low'} onChange={(e) => setProjectRank(e.target.value)} className="hidden" />
                低
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-indigo-700 mb-1">営業日</label>
            <input 
              type="date" 
              value={projectDate} 
              onChange={(e) => setProjectDate(e.target.value)} 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-slate-700"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-bold text-indigo-700 mb-1">案件内容</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="案件の内容を入力..." 
              className="w-full flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
              style={{ minHeight: '120px' }}
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 font-bold text-lg shadow-md">保存する</button>
        </form>
      </div>
    </div>
  );
};

// --- サブコンポーネント: カレンダー予定 モーダル (追加・編集・削除兼用) ---
const AddEventModal = ({ isOpen, onClose, date, event, onSave, onDelete }) => {
  const [eventDate, setEventDate] = useState(""); // 日付編集用ステート
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [rank, setRank] = useState("medium");

  useEffect(() => {
    if (isOpen) {
      if (event) {
        // 編集モード
        setEventDate(event.date || date);
        setName(event.name || "");
        setNote(event.note || "");
        setRank(event.rank || "medium");
      } else {
        // 新規モード
        setEventDate(date);
        setName("");
        setNote("");
        setRank("medium");
      }
    }
  }, [isOpen, event, date]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(eventDate, name, note, rank, event?.id); // IDがあれば更新
    onClose();
  };

  const handleDelete = () => {
    if (event && onDelete) {
      if(window.confirm("この予定を削除しますか？")) {
        onDelete(event.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 text-left">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[70vh] sm:w-full sm:max-w-md sm:rounded-xl shadow-2xl p-6 relative z-10 flex flex-col animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs text-green-600 font-bold">{event ? '予定の編集' : '予定の追加'}</span>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
          <div>
            <label className="block text-xs font-bold text-green-700 mb-1">日付</label>
            <input 
              type="date" 
              value={eventDate} 
              onChange={(e) => setEventDate(e.target.value)} 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-400 outline-none font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-green-700 mb-1">名前</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="名前を入力..." 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-green-700 mb-2">重要度</label>
            <div className="flex gap-2">
              <label className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-colors ${rank === 'high' ? 'bg-red-100 border-red-500 text-red-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <input type="radio" name="eventRank" value="high" checked={rank === 'high'} onChange={(e) => setRank(e.target.value)} className="hidden" />
                高
              </label>
              <label className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-colors ${rank === 'medium' ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <input type="radio" name="eventRank" value="medium" checked={rank === 'medium'} onChange={(e) => setRank(e.target.value)} className="hidden" />
                中
              </label>
              <label className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-colors ${rank === 'low' ? 'bg-slate-100 border-slate-500 text-slate-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <input type="radio" name="eventRank" value="low" checked={rank === 'low'} onChange={(e) => setRank(e.target.value)} className="hidden" />
                低
              </label>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-bold text-green-700 mb-1">メモ</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="メモを入力..." 
              className="w-full flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-400 outline-none resize-none"
              style={{ minHeight: '100px' }}
            />
          </div>
          
          <div className="flex gap-3">
             {event && (
               <button type="button" onClick={handleDelete} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl hover:bg-red-100 font-bold text-lg shadow-sm border border-red-100">
                 <Trash2 size={20} />
               </button>
             )}
             <button type="submit" className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-bold text-lg shadow-md">
               {event ? '更新する' : '追加する'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- サブコンポーネント: 詳細モーダル ---
const MemberDetailModal = ({ isOpen, onClose, rookie, onAddLog, onUpdateLog, onDeleteLog, onDeleteMember }) => {
  const [newLogDate, setNewLogDate] = useState(formatDate(new Date()));
  const [newLogContent, setNewLogContent] = useState("");
  const [newLogProject, setNewLogProject] = useState(""); 
  
  const [editingLogId, setEditingLogId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editProject, setEditProject] = useState("");

  useEffect(() => {
    if (isOpen && rookie) {
      setNewLogProject(rookie.currentProject || "");
      setNewLogDate(formatDate(new Date()));
      setNewLogContent("");
    }
  }, [isOpen, rookie]);

  if (!isOpen || !rookie) return null;
  const sortedLogs = [...(rookie.logs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newLogContent.trim()) return;
    onAddLog(rookie.id, newLogDate, newLogContent, newLogProject);
    setNewLogContent(""); 
  };

  const startEdit = (log) => {
    setEditingLogId(log.id);
    setEditContent(log.content);
    setEditProject(log.project || "");
  };

  const handleUpdate = (logId) => {
    onUpdateLog(rookie.id, logId, editContent, editProject);
    setEditingLogId(null);
  };

  const handleDeleteLogClick = (logId, date) => {
    if (window.confirm(`${date} の記録を削除してもよろしいですか？`)) {
      onDeleteLog(rookie.id, logId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 text-left">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-fade-in-up">
        <div className="bg-slate-50 p-4 border-b flex justify-between items-center safe-area-top">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{rookie.name}</h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><CalendarDays size={12} /> 受入日: {rookie.joinDate}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 sm:pb-6">
          
          {/* 入力フォーム */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-sm"><Plus size={16} /> フォロー・予定を記録</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-blue-700 mb-1">実施日</label>
                <input type="date" required value={newLogDate} onChange={(e) => setNewLogDate(e.target.value)} className="w-full p-2 rounded border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-blue-700 mb-1">内容</label>
                <textarea required rows="3" value={newLogContent} onChange={(e) => setNewLogContent(e.target.value)} placeholder="面談内容を入力..." className="w-full p-2 rounded border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-700 mb-1">案件</label>
                <textarea 
                  value={newLogProject} 
                  onChange={(e) => setNewLogProject(e.target.value)} 
                  placeholder="案件情報を入力..." 
                  className="w-full p-2 rounded border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-indigo-50/50" 
                  rows="2"
                />
                <p className="text-[10px] text-blue-400 mt-1 text-right">※変更すると「案件一覧」にも反映されます</p>
              </div>

              <div className="text-right">
                <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 ml-auto font-bold text-sm"><Save size={16} /> 記録する</button>
              </div>
            </form>
          </div>

          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm"><History size={16} /> フォロー履歴</h3>
            {sortedLogs.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">まだ記録がありません</p>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-2 space-y-6 py-2">
                {sortedLogs.map((log) => {
                  const daysDiff = getDaysDiff(log.date);
                  const isFuture = daysDiff < 0;
                  const isToday = daysDiff === 0;
                  return (
                    <div key={log.id} className="relative pl-6">
                      <div className={`absolute -left-[5px] top-1.5 w-3 h-3 bg-white border-2 rounded-full ${isToday ? 'border-orange-500 bg-orange-500' : isFuture ? 'border-amber-400' : 'border-blue-400'}`}></div>
                      <div className={`p-3 rounded-lg border shadow-sm group ${isToday ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isToday ? 'bg-orange-200 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>{log.date}</span>
                            <span className={`text-[10px] ${isToday ? 'text-orange-600 font-bold' : isFuture ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                              {isToday ? '本日' : isFuture ? `あと${Math.abs(daysDiff)}日` : `${daysDiff}日前`}
                            </span>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editingLogId !== log.id && (
                              <>
                                <button onClick={() => startEdit(log)} className="p-1 text-slate-300 hover:text-blue-500" title="編集">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteLogClick(log.id, log.date)} className="p-1 text-slate-300 hover:text-red-500" title="削除">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {log.project && (
                          <div className="mt-2 mb-1">
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-medium inline-flex items-center">
                              <Briefcase size={10} className="mr-1"/> {log.project}
                            </span>
                          </div>
                        )}

                        {editingLogId === log.id ? (
                          <div className="mt-2">
                            <textarea 
                              value={editContent} 
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none mb-2"
                              rows="3"
                              placeholder="内容"
                            />
                             <textarea 
                              value={editProject}
                              onChange={(e) => setEditProject(e.target.value)}
                              placeholder="案件名"
                              className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none bg-indigo-50/30"
                              rows="1"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditingLogId(null)} className="text-xs px-2 py-1 text-slate-500">キャンセル</button>
                              <button onClick={() => handleUpdate(log.id)} className="bg-blue-600 text-white text-xs px-3 py-1 rounded flex items-center gap-1 font-bold"><Check size={12}/> 保存</button>
                            </div>
                          </div>
                        ) : (
                          <p className={`text-sm whitespace-pre-wrap leading-relaxed mt-1 ${isToday ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>{log.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="bg-slate-50 p-4 border-t flex justify-end safe-area-bottom">
          <button onClick={() => onDeleteMember(rookie)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded flex items-center gap-2 text-sm transition font-bold"><Trash2 size={16} /> メンバー削除</button>
        </div>
      </div>
    </div>
  );
};

// --- コンポーネント: メンバー追加モーダル ---
const AddMemberModal = ({ isOpen, onClose, onAddMember }) => {
  const [name, setName] = useState("");
  const [joinDate, setJoinDate] = useState(formatDate(new Date()));
  const [initialLog, setInitialLog] = useState("");
  const [initialProject, setInitialProject] = useState(""); 

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddMember(name, joinDate, initialLog, initialProject);
    setName("");
    setJoinDate(formatDate(new Date()));
    setInitialLog("");
    setInitialProject("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 text-left">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-md sm:rounded-xl shadow-2xl p-6 relative z-10 flex flex-col justify-center sm:block animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">メンバー追加</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">名前 <span className="text-red-500">*</span></label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例: 佐藤 健太" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">受入日 (担当開始日)</label>
            <input type="date" required value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">初回の案件内容</label>
            <textarea rows="2" value={initialProject} onChange={(e) => setInitialProject(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例: A社提案" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">初回のフォロー記録</label>
            <textarea rows="2" value={initialLog} onChange={(e) => setInitialLog(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例: 本人挨拶済み。" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-bold text-lg shadow-md">追加する</button>
        </form>
      </div>
    </div>
  );
};

// --- メインアプリ ---
const App = () => {
  const [user, setUser] = useState(null); 
  const [rookies, setRookies] = useState([]);
  const [events, setEvents] = useState([]); 
  const [appHistory, setAppHistory] = useState([]); 
  const [memoOrder, setMemoOrder] = useState([]); 
  
  const [viewMode, setViewMode] = useState('list'); 
  const [selectedRookie, setSelectedRookie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  
  const [isProjectEditOpen, setIsProjectEditOpen] = useState(false);
  const [editingProjectRookie, setEditingProjectRookie] = useState(null);
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventDate, setSelectedEventDate] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  
  const [projectSortOrder, setProjectSortOrder] = useState('rank_desc'); 
  const [isReorderingMemo, setIsReorderingMemo] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("daysAgo");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState(null);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50; 

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) changeMonth(1); 
    if (isRightSwipe) changeMonth(-1); 
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Failed:", error);
        setConnError("認証に失敗しました。");
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return; 

    const qRookies = collection(db, 'artifacts', appId, 'public', 'data', 'rookies');
    const unsubRookies = onSnapshot(qRookies, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRookies(data);
      setLoading(false);
    });

    const qEvents = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
    }, (error) => { console.log("No events yet"); });

    const qHistory = query(collection(db, 'artifacts', appId, 'public', 'data', 'app_history'), orderBy('timestamp', 'desc'));
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppHistory(data);
    }, (error) => {
        const qHistorySafe = collection(db, 'artifacts', appId, 'public', 'data', 'app_history');
        onSnapshot(qHistorySafe, (snap) => {
            const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            d.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setAppHistory(d);
        });
    });

    const settingsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.memoOrder) setMemoOrder(data.memoOrder);
      }
    }, (err) => console.log("Settings not found yet"));

    return () => {
      unsubRookies();
      unsubEvents();
      unsubHistory();
      unsubSettings();
    };
  }, [user]);

  const logAction = async (text) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'app_history'), {
        text,
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error("Log Error:", e); }
  };

  const projectList = useMemo(() => {
    const list = [...rookies];
    const getRankWeight = (rank) => {
      switch(rank) {
        case 'high': return 3;
        case 'medium': return 2;
        default: return 1;
      }
    };

    list.sort((a, b) => {
      const tA = a.projectUpdatedAt?.seconds || a.createdAt?.seconds || 0;
      const tB = b.projectUpdatedAt?.seconds || b.createdAt?.seconds || 0;
      
      if (projectSortOrder === 'rank_desc' || projectSortOrder === 'rank_asc') {
        const weightA = getRankWeight(a.projectRank);
        const weightB = getRankWeight(b.projectRank);
        const diff = projectSortOrder === 'rank_desc' ? weightB - weightA : weightA - weightB;
        if (diff !== 0) return diff;
        const dateA = a.projectDate || "";
        const dateB = b.projectDate || "";
        return dateB.localeCompare(dateA);
      }
      if (projectSortOrder === 'newest') return tB - tA;
      if (projectSortOrder === 'oldest') return tA - tB;
      return 0;
    });
    return list;
  }, [rookies, projectSortOrder]);

  const memoList = useMemo(() => {
    let list = [];
    rookies.forEach(r => {
      if(r.currentProject) {
        list.push({
          id: r.id,
          type: 'project',
          name: r.name,
          content: r.currentProject,
          rank: r.projectRank || 'low',
          displayDate: r.projectDate || r.createdAt?.toDate?.()?.toLocaleDateString() || "",
          sortDate: r.projectDate || "" 
        });
      }
    });
    events.forEach(e => {
      list.push({
        id: e.id,
        type: 'event',
        name: e.name,
        content: e.note,
        rank: e.rank || 'medium',
        displayDate: e.date,
        sortDate: e.date || "" 
      });
    });

    if (memoOrder.length > 0) {
      const orderedList = [];
      const unorderedList = [];
      const itemMap = new Map();
      list.forEach(item => itemMap.set(item.id, item));

      memoOrder.forEach(id => {
        if(itemMap.has(id)) {
          orderedList.push(itemMap.get(id));
          itemMap.delete(id);
        }
      });

      itemMap.forEach(item => unorderedList.push(item));
      unorderedList.sort((a,b) => b.displayDate.localeCompare(a.displayDate));

      return [...orderedList, ...unorderedList];
    } else {
      return list.sort((a, b) => b.displayDate.localeCompare(a.displayDate));
    }
  }, [rookies, events, memoOrder]);

  const handleMoveItem = async (itemId, direction) => {
    const currentList = [...memoList];
    const index = currentList.findIndex(i => i.id === itemId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentList.length) return;

    const temp = currentList[index];
    currentList[index] = currentList[newIndex];
    currentList[newIndex] = temp;

    const newOrder = currentList.map(i => i.id);
    setMemoOrder(newOrder); 

    try {
      if(!user) return;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), {
        memoOrder: newOrder
      }, { merge: true });
    } catch (e) {
      console.error("Save order error", e);
    }
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (sourceId === targetId) return;

    const currentList = [...memoList];
    const sourceIndex = currentList.findIndex(i => i.id === sourceId);
    const targetIndex = currentList.findIndex(i => i.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedItem] = currentList.splice(sourceIndex, 1);
    currentList.splice(targetIndex, 0, movedItem);

    const newOrder = currentList.map(i => i.id);
    setMemoOrder(newOrder);

    if(user) {
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), {
        memoOrder: newOrder
      }, { merge: true }).catch(console.error);
    }
  };

  // --- アクション ---

  const handleSaveEvent = async (date, name, note, rank, eventId) => {
    if (!user) return;
    try {
      if (eventId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId), {
          date, name, note, rank
        });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), {
          date, name, note, rank,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Error saving event", e);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId));
    } catch (e) {
      console.error("Error deleting event", e);
    }
  };

  const handleUpdateProjectOnly = async (rookieId, newProjectContent, newProjectDate, newRank) => {
    if(!user) return;
    const rookieRef = doc(db, 'artifacts', appId, 'public', 'data', 'rookies', rookieId);
    const targetRookie = rookies.find(r => r.id === rookieId);
    if(targetRookie) {
      await updateDoc(rookieRef, {
        currentProject: newProjectContent,
        projectDate: newProjectDate,
        projectRank: newRank,
        projectUpdatedAt: serverTimestamp()
      });
    }
  };

  const handleAddLog = async (rookieId, date, content, project) => {
    const newLog = { id: Date.now().toString(), date, content, project };
    if (!user) return;
    const rookieRef = doc(db, 'artifacts', appId, 'public', 'data', 'rookies', rookieId);
    const targetRookie = rookies.find(r => r.id === rookieId);
    if (targetRookie) {
      await updateDoc(rookieRef, { 
        logs: [...(targetRookie.logs || []), newLog],
        currentProject: project, 
        projectUpdatedAt: serverTimestamp()
      });
    }
  };

  const handleUpdateLog = async (rookieId, logId, newContent, newProject) => {
    if (!user) return;
    const rookieRef = doc(db, 'artifacts', appId, 'public', 'data', 'rookies', rookieId);
    const targetRookie = rookies.find(r => r.id === rookieId);
    if (targetRookie) {
      const updatedLogs = targetRookie.logs.map(log => 
        log.id === logId ? { ...log, content: newContent, project: newProject } : log
      );
      await updateDoc(rookieRef, { logs: updatedLogs });
    }
  };

  const handleDeleteLog = async (rookieId, logId) => {
    if (!user) return;
    const rookieRef = doc(db, 'artifacts', appId, 'public', 'data', 'rookies', rookieId);
    const targetRookie = rookies.find(r => r.id === rookieId);
    if (targetRookie) {
      const filteredLogs = targetRookie.logs.filter(log => log.id !== logId);
      await updateDoc(rookieRef, { logs: filteredLogs });
    }
  };

  const handleAddMember = async (name, joinDate, initialLogContent, initialProject) => {
    const initialLogs = initialLogContent ? [{ id: Date.now().toString(), date: joinDate, content: initialLogContent, project: initialProject }] : [];
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rookies'), { 
      name, 
      joinDate, 
      logs: initialLogs,
      currentProject: initialProject,
      createdAt: serverTimestamp(),
      projectUpdatedAt: serverTimestamp()
    });
    setIsAddMemberModalOpen(false);
  };

  const handleDeleteMember = async (rookie) => {
    if (window.confirm(`${rookie.name} さんを削除してもよろしいですか？`)) {
      if (!user) return;
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rookies', rookie.id));
      setIsModalOpen(false);
      setSelectedRookie(null);
    }
  };

  const getLastPastMeeting = (rookie) => {
    if (!rookie.logs || rookie.logs.length === 0) return { date: null, daysDiff: null };
    const pastLogs = rookie.logs.filter(log => getDaysDiff(log.date) >= 0);
    if (pastLogs.length === 0) return { date: null, daysDiff: null };
    const sortedPastLogs = [...pastLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastLog = sortedPastLogs[0];
    return { date: lastLog.date, daysDiff: getDaysDiff(lastLog.date) };
  };

  const getLatestAnyMeeting = (rookie) => {
    if (!rookie.logs || rookie.logs.length === 0) return { date: null, daysDiff: null, isFuture: false };
    const todayStr = formatDate(new Date());
    const futureLogs = rookie.logs.filter(log => log.date > todayStr);
    const pastLogs = rookie.logs.filter(log => log.date <= todayStr);
    if (futureLogs.length > 0) {
      const nearestFuture = futureLogs.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      const diff = getDaysDiff(nearestFuture.date);
      return { date: nearestFuture.date, daysDiff: diff, isFuture: true };
    } else {
      const latestPast = pastLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (!latestPast) return { date: null, daysDiff: null, isFuture: false };
      const diff = getDaysDiff(latestPast.date);
      return { date: latestPast.date, daysDiff: diff, isFuture: false };
    }
  };

  const todayRookies = useMemo(() => {
    const todayStr = formatDate(new Date());
    return rookies.filter(r => r.logs && r.logs.some(l => l.date === todayStr));
  }, [rookies]);

  const processedRookies = useMemo(() => {
    let data = rookies.map(r => {
      const lastPast = getLastPastMeeting(r);
      const latestAny = getLatestAnyMeeting(r);
      return { 
        ...r, 
        lastPastMeetingDate: lastPast.date,
        lastPastDaysDiff: lastPast.daysDiff,
        displayDate: latestAny.date,
        displayDaysDiff: latestAny.daysDiff,
        isDisplayFuture: latestAny.isFuture
      };
    });
    if (searchTerm) {
      data = data.filter(r => r.name.includes(searchTerm));
    }
    data.sort((a, b) => {
      const aVal = a.lastPastDaysDiff;
      const bVal = b.lastPastDaysDiff;
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return sortKey === 'daysAgo' ? bVal - aVal : aVal - bVal;
    });
    return data;
  }, [rookies, searchTerm, sortKey]);

  const allLogs = useMemo(() => {
    let logs = [];
    rookies.forEach(r => {
      if (r.logs) {
        r.logs.forEach(log => {
          logs.push({ ...log, rookieId: r.id, rookieName: r.name });
        });
      }
    });
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [rookies]);

  const getStatusColor = (daysDiff) => {
    if (daysDiff === null) return "bg-slate-100 text-slate-500 border-slate-200";
    if (daysDiff === 0) return "bg-orange-100 text-orange-800 border-orange-200"; 
    if (daysDiff < 0) return "bg-amber-100 text-amber-800 border-amber-200"; 
    if (daysDiff >= 14) return "bg-red-100 text-red-800 border-red-200";
    if (daysDiff >= 7) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  if (loading && !connError) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  if (connError) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{connError}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20 sm:pb-0 flex flex-col">
      <style>{` @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; } .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
      <header className="bg-white shadow sticky top-0 z-10 safe-area-top">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><Users className="text-blue-600" /><h1 className="text-lg font-bold">Rookie Manager</h1></div>
          <button onClick={() => setIsAddMemberModalOpen(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-bold hover:bg-blue-700 flex items-center gap-1 shadow-sm"><UserPlus size={16} /> <span className="hidden sm:inline">メンバー追加</span><span className="sm:hidden">追加</span></button>
        </div>
        <div className="flex max-w-6xl mx-auto px-4 gap-4 text-sm font-medium border-t overflow-x-auto hide-scrollbar">
          <button onClick={() => setViewMode('list')} className={`py-3 flex-shrink-0 border-b-2 transition ${viewMode === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>一覧</button>
          <button onClick={() => setViewMode('calendar')} className={`py-3 flex-shrink-0 border-b-2 transition ${viewMode === 'calendar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>予定</button>
          <button onClick={() => { setViewMode('project'); setProjectSortOrder('rank_desc'); }} className={`py-3 flex-shrink-0 border-b-2 transition ${viewMode === 'project' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>案件</button>
          <button onClick={() => setViewMode('memo')} className={`py-3 flex-shrink-0 border-b-2 transition ${viewMode === 'memo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>メモ</button>
        </div>
      </header>

      <main className={`max-w-6xl mx-auto w-full ${viewMode === 'calendar' ? 'p-0 flex-1 flex flex-col' : 'p-3 sm:p-4'}`}>
        {viewMode === 'list' && todayRookies.length > 0 && (
          <div className="mb-4 bg-orange-500 text-white p-3 rounded-xl shadow-lg flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full"><Bell size={20} className="animate-bounce" /></div>
              <div><p className="text-xs font-bold opacity-90">本日のフォロー予定</p><p className="text-sm font-bold">{todayRookies.map(r => r.name).join(' さん、')} さん</p></div>
            </div>
            <Zap size={24} className="text-yellow-300 opacity-50" />
          </div>
        )}

        {viewMode === 'list' && (
          <>
            <div className="flex gap-3 mb-4 items-center justify-between bg-white p-3 rounded-lg shadow-sm">
              <div className="relative flex-1 text-left"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="名前検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="flex gap-2">
                <button onClick={() => setSortKey('daysAgo')} className={`px-3 py-2 text-xs rounded border flex items-center gap-1 ${sortKey === 'daysAgo' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-600'}`}><Clock size={14} /> ご無沙汰</button>
                <button onClick={() => setSortKey('recent')} className={`px-3 py-2 text-xs rounded border flex items-center gap-1 ${sortKey === 'recent' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-600'}`}><ListFilter size={14} /> 最近</button>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {processedRookies.map((rookie) => (
                <div key={rookie.id} onClick={() => { setSelectedRookie(rookie); setIsModalOpen(true); }} className={`bg-white rounded-lg shadow-sm hover:shadow-md transition cursor-pointer border overflow-hidden group ${rookie.displayDaysDiff === 0 ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-100'}`}>
                  <div className="p-3 text-left h-full flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="text-[9px] text-slate-400 mb-0.5 flex items-center gap-0.5"><Clock size={9} /> 前: {rookie.lastPastMeetingDate || "未"}</div>
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{rookie.name}</h3>
                      </div>
                      <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${getStatusColor(rookie.displayDaysDiff)}`}>
                        {rookie.displayDaysDiff === null ? '未' : 
                         rookie.displayDaysDiff === 0 ? '本日' :
                         rookie.isDisplayFuture ? `あと${Math.abs(rookie.displayDaysDiff)}日` : 
                         `${rookie.displayDaysDiff}日前`}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center text-[10px] text-slate-500">
                      <Calendar size={10} className="mr-1" /> 
                      <span className="font-medium truncate">
                        {rookie.isDisplayFuture ? '次回' : '最新'}: {rookie.displayDate || "-"}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 flex-1">
                       <div className="flex items-center text-xs text-slate-700">
                          <Briefcase size={12} className="mr-1.5 text-indigo-400 flex-shrink-0" />
                          <span className="truncate">{rookie.currentProject || <span className="text-slate-300">案件なし</span>}</span>
                       </div>
                       <div className="flex items-center text-xs text-slate-600">
                          <MessageSquare size={12} className="mr-1.5 text-slate-400 flex-shrink-0" />
                          {rookie.logs && rookie.logs.length > 0 ? 
                            <span className="truncate">{[...rookie.logs].sort((a,b)=>new Date(b.date)-new Date(a.date))[0].content}</span> : 
                            <span className="text-slate-300">記録なし</span>
                          }
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* カレンダー */}
        {viewMode === 'calendar' && (
          <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-slate-200 overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ChevronLeft size={24} /></button>
              <h2 className="text-lg font-bold text-slate-800">{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</h2>
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ChevronRight size={24} /></button>
            </div>
            {/* スワイプ対応エリア */}
            <div 
              onTouchStart={onTouchStart} 
              onTouchMove={onTouchMove} 
              onTouchEnd={onTouchEnd}
              className="touch-pan-y flex-1 flex flex-col" 
            >
              <div className="grid grid-cols-7 border-b text-center text-[10px] font-bold text-slate-500 bg-slate-50"><div className="py-2 text-red-400">日</div><div className="py-2">月</div><div className="py-2">火</div><div className="py-2">水</div><div className="py-2">木</div><div className="py-2">金</div><div className="py-2 text-blue-400">土</div></div>
              <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px flex-1">
                {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay())].map((_, i) => (
                  <div key={`empty-${i}`} className="bg-slate-50 min-h-[80px]"></div>
                ))}
                {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dateStr = formatDate(dateObj);
                  const isToday = new Date().toDateString() === dateObj.toDateString();
                  
                  // 1. メンバーの予定
                  const dayLogs = allLogs.filter(log => log.date === dateStr);
                  // 2. カレンダー独自予定
                  const dayEvents = events.filter(ev => ev.date === dateStr);

                  return (
                    <div key={day} 
                      className={`bg-white min-h-[80px] p-0.5 flex flex-col ${isToday ? 'bg-orange-50' : ''}`}
                      onClick={() => { setSelectedEventDate(dateStr); setEditingEvent(null); setIsEventModalOpen(true); }} // 新規追加
                    >
                      <span className={`text-[10px] font-bold mb-0.5 ${isToday ? 'text-orange-600' : 'text-slate-400'}`}>{day}</span>
                      <div className="space-y-0.5 overflow-y-auto max-h-[80px] hide-scrollbar">
                        {/* メンバー予定 */}
                        {dayLogs.map((log, i) => (
                          <div key={`log-${i}`} className={`text-[8px] px-1 py-0.5 rounded truncate cursor-pointer leading-tight border ${getDaysDiff(log.date) < 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : getDaysDiff(log.date) === 0 ? 'bg-orange-500 text-white border-orange-600 font-bold' : 'bg-blue-100 text-blue-800 border-blue-200'}`} onClick={(e) => { e.stopPropagation(); const r = rookies.find(r => r.id === log.rookieId); if(r) { setSelectedRookie(r); setIsModalOpen(true); } }}>{log.rookieName}</div>
                        ))}
                        {/* 独自予定 */}
                        {dayEvents.map((ev, i) => (
                           <div 
                             key={`ev-${i}`} 
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               setEditingEvent(ev); 
                               setSelectedEventDate(dateStr); 
                               setIsEventModalOpen(true); // 編集モード
                             }}
                             className="text-[8px] px-1 py-0.5 rounded truncate cursor-pointer leading-tight border bg-green-100 text-green-800 border-green-200"
                           >
                             {ev.name}
                           </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 案件一覧 */}
        {viewMode === 'project' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-700">案件一覧</h2>
              <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
                <button onClick={() => setProjectSortOrder('rank_desc')} className={`px-2 py-1.5 text-[10px] flex items-center gap-1 ${projectSortOrder === 'rank_desc' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'}`}><TrendingUp size={10} /> 高</button>
                <div className="w-px bg-slate-200"></div>
                <button onClick={() => setProjectSortOrder('rank_asc')} className={`px-2 py-1.5 text-[10px] flex items-center gap-1 ${projectSortOrder === 'rank_asc' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'}`}><TrendingUp size={10} className="rotate-180" /> 低</button>
                <div className="w-px bg-slate-200"></div>
                <button onClick={() => setProjectSortOrder('newest')} className={`px-2 py-1.5 text-[10px] flex items-center gap-1 ${projectSortOrder === 'newest' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'}`}><ArrowUp size={10} /> 新</button>
                <div className="w-px bg-slate-200"></div>
                <button onClick={() => setProjectSortOrder('oldest')} className={`px-2 py-1.5 text-[10px] flex items-center gap-1 ${projectSortOrder === 'oldest' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'}`}><ArrowDown size={10} /> 古</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 auto-rows-max">
              {projectList.map(rookie => (
                <ProjectCard key={rookie.id} item={rookie} onClick={() => { setEditingProjectRookie(rookie); setIsProjectEditOpen(true); }} />
              ))}
            </div>
          </div>
        )}

        {/* メモ (旧履歴) */}
        {viewMode === 'memo' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-700">統合メモ</h2>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setIsReorderingMemo(!isReorderingMemo)} 
                   className={`px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1 transition-colors ${isReorderingMemo ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                 >
                   <ListFilter size={14}/> 並び替えモード {isReorderingMemo ? 'ON' : 'OFF'}
                 </button>
              </div>
            </div>
            <div className="space-y-2 pb-20">
              {memoList.length === 0 ? <div className="p-8 text-center text-slate-400">メモなし</div> : (
                memoList.map((item) => (
                  <MemoListItem 
                    key={item.id} 
                    item={item} 
                    isReordering={isReorderingMemo}
                    onMoveUp={() => handleMoveItem(item.id, -1)}
                    onMoveDown={() => handleMoveItem(item.id, 1)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDelete={handleDeleteEvent} // 削除ハンドラを追加
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 safe-area-bottom z-40">
        <button onClick={() => setViewMode('list')} className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'list' ? 'text-blue-600' : 'text-slate-400'}`}><Users size={20} /><span className="text-[10px] mt-1 font-bold">一覧</span></button>
        <button onClick={() => setViewMode('calendar')} className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'calendar' ? 'text-blue-600' : 'text-slate-400'}`}><Calendar size={20} /><span className="text-[10px] mt-1 font-bold">予定</span></button>
        <button onClick={() => { setViewMode('project'); setProjectSortOrder('rank_desc'); }} className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'project' ? 'text-blue-600' : 'text-slate-400'}`}><Briefcase size={20} /><span className="text-[10px] mt-1 font-bold">案件</span></button>
        <button onClick={() => setViewMode('memo')} className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'memo' ? 'text-blue-600' : 'text-slate-400'}`}><StickyNote size={20} /><span className="text-[10px] mt-1 font-bold">メモ</span></button>
      </nav>

      <MemberDetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} rookie={selectedRookie} onAddLog={handleAddLog} onUpdateLog={handleUpdateLog} onDeleteLog={handleDeleteLog} onDeleteMember={handleDeleteMember} />
      <AddMemberModal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} onAddMember={handleAddMember} />
      <ProjectEditModal isOpen={isProjectEditOpen} onClose={() => setIsProjectEditOpen(false)} rookie={editingProjectRookie} onSave={handleUpdateProjectOnly} />
      <AddEventModal 
        isOpen={isEventModalOpen} 
        onClose={() => setIsEventModalOpen(false)} 
        date={selectedEventDate} 
        event={editingEvent} // 編集用データを渡す
        onSave={handleSaveEvent} 
        onDelete={handleDeleteEvent} // 削除ハンドラを渡す
      />
    </div>
  );
};

export default App;