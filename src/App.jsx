import React, { useState, useEffect, useMemo } from 'react';
import { Users, Calendar, Clock, Plus, MessageSquare, Search, ChevronRight, X, Save, Trash2, ListFilter, ChevronLeft, UserPlus, CalendarDays, History, Loader2, AlertCircle, Edit2, Check, Bell, Zap, Briefcase, Activity, ArrowUp, ArrowDown, TrendingUp, StickyNote, PenTool, GripVertical, ArrowUpCircle, ArrowDownCircle, CheckCircle2 } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- エラー捕捉用コンポーネント ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-6 flex flex-col items-center justify-center text-red-900">
          <AlertCircle size={48} className="mb-4 text-red-600" />
          <h1 className="text-xl font-bold mb-2">エラーが発生しました</h1>
          <p className="text-sm font-mono bg-white p-4 rounded border border-red-200 max-w-lg overflow-auto">{this.state.error?.toString()}</p>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded shadow-md font-bold">再読み込みして解決</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

// --- サブコンポーネント ---

const ProjectCard = ({ item, onClick }) => {
  if (!item) return null;
  const getRankStyle = (rank) => {
    switch(rank) {
      case 'high': return "bg-red-50 border-red-200 shadow-red-100";
      case 'medium': return "bg-indigo-50 border-indigo-200 shadow-indigo-100";
      default: return "bg-white border-slate-200 shadow-slate-100";
    }
  };
  const getRankLabel = (rank) => {
    switch(rank) {
      case 'high': return { text: "高", color: "text-red-600 bg-red-100 border-red-200" };
      case 'medium': return { text: "中", color: "text-indigo-600 bg-indigo-100 border-indigo-200" };
      default: return { text: "低", color: "text-slate-500 bg-slate-100 border-slate-200" };
    }
  };
  const rankLabel = getRankLabel(item.projectRank);
  return (
    <div onClick={() => onClick && onClick(item)} className={`${getRankStyle(item.projectRank)} border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-col h-full active:scale-95`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1"><Users size={12}/>{item.name}</h3>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${rankLabel.color}`}>{rankLabel.text}</span>
      </div>
      <p className="text-xs text-slate-700 flex-1 line-clamp-3">{item.currentProject || "案件情報なし"}</p>
      <div className="mt-2 pt-2 border-t border-black/5 flex justify-between items-center text-[10px] text-slate-500">
        <span>営業日: {item.projectDate || "未設定"}</span>
        <Edit2 size={10} className="opacity-50" />
      </div>
    </div>
  );
};

const MemoListItem = ({ item, isReordering, onMoveUp, onMoveDown, onDelete }) => {
  const daysDiff = getDaysDiff(item.displayDate);
  const isToday = daysDiff === 0;
  const getRankBadge = (rank) => {
    switch(rank) {
      case 'high': return <span className="bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold">高</span>;
      case 'medium': return <span className="bg-indigo-100 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold">中</span>;
      default: return <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">低</span>;
    }
  };
  return (
    <div className={`p-3 rounded-lg border shadow-sm mb-2 transition-all relative group bg-green-50 border-green-200 ${isToday ? 'ring-2 ring-orange-300' : ''}`}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          {isReordering && <GripVertical size={16} className="text-slate-400 cursor-grab" />}
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1"><PenTool size={12} className="text-green-600"/>{item.name}</h3>
        </div>
        <div className="flex items-center gap-2">
           <span className={`text-[10px] font-mono ${isToday ? 'text-orange-600 font-bold' : 'text-slate-500'}`}>{item.displayDate} {isToday ? '(本日)' : `(あと${Math.abs(daysDiff)}日)`}</span>
           {getRankBadge(item.rank)}
           {isReordering && (
             <div className="flex gap-1 ml-2">
               <button onClick={() => onMoveUp(item.id)} className="text-blue-500 p-1 bg-blue-50 rounded"><ArrowUp size={14}/></button>
               <button onClick={() => onMoveDown(item.id)} className="text-blue-500 p-1 bg-blue-50 rounded"><ArrowDown size={14}/></button>
             </div>
           )}
        </div>
      </div>
      <p className="text-sm text-slate-700 pl-4 border-l-2 border-slate-200 ml-1 whitespace-pre-wrap">{item.content}</p>
      {!isReordering && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
      )}
    </div>
  );
};

const ProjectEditModal = ({ isOpen, onClose, rookie, onSave }) => {
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [rank, setRank] = useState("low");
  useEffect(() => { if (rookie) { setContent(rookie.currentProject || ""); setDate(rookie.projectDate || ""); setRank(rookie.projectRank || "low"); } }, [rookie, isOpen]);
  if (!isOpen || !rookie) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative z-10 animate-fade-in-up">
        <h2 className="text-lg font-bold mb-4">{rookie.name} の案件編集</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(rookie.id, content, date, rank); onClose(); }} className="space-y-4">
          <div><label className="block text-xs font-bold mb-1">優先度</label><div className="flex gap-2">{['high','medium','low'].map(r=><label key={r} className={`flex-1 p-2 rounded-lg border text-center cursor-pointer ${rank===r? r==='high'?'bg-red-500 text-white font-bold':r==='medium'?'bg-indigo-500 text-white font-bold':'bg-slate-500 text-white font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><input type="radio" value={r} checked={rank===r} onChange={(e)=>setRank(e.target.value)} className="hidden"/>{r==='high'?'高':r==='medium'?'中':'低'}</label>)}</div></div>
          <div><label className="block text-xs font-bold mb-1">営業日</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full p-2 border rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
          <div><label className="block text-xs font-bold mb-1">内容</label><textarea value={content} onChange={(e)=>setContent(e.target.value)} rows="4" className="w-full p-2 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="案件内容を入力..."/></div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors">保存する</button>
        </form>
      </div>
    </div>
  );
};

const AddEventModal = ({ isOpen, onClose, date, event, onSave, onDelete }) => {
  const [evDate, setEvDate] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [rank, setRank] = useState("medium");
  useEffect(() => {
    if (isOpen) {
      setEvDate(event?.date || date);
      setName(event?.name || "");
      setNote(event?.note || "");
      setRank(event?.rank || "medium");
    }
  }, [isOpen, event, date]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative z-10 animate-fade-in-up">
        <h2 className="text-lg font-bold mb-4">{event ? '予定の編集' : '予定の追加'}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(evDate, name, note, rank, event?.id); onClose(); }} className="space-y-4 text-left">
          <div><label className="block text-xs font-bold text-green-700 mb-1">日付</label><input type="date" value={evDate} onChange={(e)=>setEvDate(e.target.value)} className="w-full p-2 border rounded-lg font-bold" required/></div>
          <div><label className="block text-xs font-bold text-green-700 mb-1">名前</label><input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full p-2 border rounded-lg" required placeholder="名前を入力..."/></div>
          <div><label className="block text-xs font-bold text-green-700 mb-2">重要度</label><div className="flex gap-2">{['high','medium','low'].map(r=><label key={r} className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-all ${rank===r?'bg-green-600 text-white font-bold':'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><input type="radio" value={r} checked={rank===r} onChange={(e)=>setRank(e.target.value)} className="hidden"/>{r==='high'?'高':r==='medium'?'中':'低'}</label>)}</div></div>
          <div className="flex-1 flex flex-col"><label className="block text-xs font-bold text-green-700 mb-1">メモ</label><textarea value={note} onChange={(e)=>setNote(e.target.value)} rows="3" className="w-full p-2 border rounded-lg resize-none" placeholder="内容を入力..."/></div>
          <div className="flex gap-2 pt-2">
            {event && <button type="button" onClick={()=>{if(window.confirm("この予定を削除しますか？")){onDelete(event.id);onClose();}}} className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-colors"><Trash2 size={20}/></button>}
            <button type="submit" className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition-colors">{event ? '更新する' : '追加する'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MemberDetailModal = ({ isOpen, onClose, rookie, onAddLog, onDeleteLog, onDeleteMember }) => {
  const [logDate, setLogDate] = useState(formatDate(new Date()));
  const [logContent, setLogContent] = useState("");
  const [logProject, setLogProject] = useState("");
  useEffect(() => { if (rookie) { setLogProject(rookie.currentProject || ""); setLogDate(formatDate(new Date())); setLogContent(""); } }, [rookie, isOpen]);
  if (!isOpen || !rookie) return null;
  const sortedLogs = [...(rookie.logs || [])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl shadow-2xl flex flex-col relative z-10 animate-fade-in-up overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 safe-area-top">
          <div><h2 className="text-lg font-bold">{rookie.name}</h2><p className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays size={12}/>受入日: {rookie.joinDate}</p></div>
          <button onClick={onClose} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 sm:pb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2"><Plus size={16}/> フォロー記録を追加</h3>
            <input type="date" value={logDate} onChange={(e)=>setLogDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white font-bold"/>
            <textarea value={logContent} onChange={(e)=>setLogContent(e.target.value)} placeholder="面談内容などを入力..." rows="3" className="w-full p-2 border rounded-lg text-sm"/>
            <textarea value={logProject} onChange={(e)=>setLogProject(e.target.value)} placeholder="案件情報があれば入力..." rows="2" className="w-full p-2 border rounded-lg text-sm bg-indigo-50/50"/>
            <button onClick={()=>{if(!logContent.trim())return;onAddLog(rookie.id,logDate,logContent,logProject);setLogContent("");}} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm shadow hover:bg-blue-700 transition-colors">記録する</button>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><History size={16}/> フォロー履歴</h3>
            {sortedLogs.length === 0 ? <p className="text-slate-400 text-center text-sm py-4">まだ履歴がありません</p> : sortedLogs.map(log => (
              <div key={log.id} className="border-l-4 border-slate-200 pl-4 py-1 relative group">
                <div className="flex justify-between items-start">
                   <span className="text-[10px] text-slate-500 font-bold">{log.date} ({getDaysDiff(log.date)>=0?`${getDaysDiff(log.date)}日前`:`あと${Math.abs(getDaysDiff(log.date))}日`})</span>
                   <button onClick={()=>{if(window.confirm("この記録を削除しますか？"))onDeleteLog(rookie.id,log.id)}} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                </div>
                {log.project && <div className="text-[10px] text-indigo-600 font-bold mt-0.5">案件: {log.project}</div>}
                <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1 leading-relaxed">{log.content}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t bg-slate-50 flex justify-end safe-area-bottom"><button onClick={()=>onDeleteMember(rookie)} className="text-red-500 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"><Trash2 size={16}/> メンバー削除</button></div>
      </div>
    </div>
  );
};

const AddMemberModal = ({ isOpen, onClose, onAddMember }) => {
  const [name, setName] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [pj, setPj] = useState("");
  const [log, setLog] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative z-10 animate-fade-in-up">
        <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800">メンバー追加</h2><button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
        <form onSubmit={(e)=>{e.preventDefault();onAddMember(name,date,log,pj);onClose();setName("");setPj("");setLog("");}} className="space-y-4">
          <div><label className="block text-sm font-bold mb-1">名前 *</label><input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full p-2 border rounded-lg" required/></div>
          <div><label className="block text-sm font-bold mb-1">受入日</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full p-2 border rounded-lg" required/></div>
          <div><label className="block text-sm font-bold mb-1">初回の案件</label><textarea value={pj} onChange={(e)=>setPj(e.target.value)} rows="2" className="w-full p-2 border rounded-lg"/></div>
          <div><label className="block text-sm font-bold mb-1">初回のフォロー</label><textarea value={log} onChange={(e)=>setLog(e.target.value)} rows="2" className="w-full p-2 border rounded-lg"/></div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md">追加する</button>
        </form>
      </div>
    </div>
  );
};

// --- メインアプリ ---
const MainApp = () => {
  const [user, setUser] = useState(null); 
  const [rookies, setRookies] = useState([]);
  const [events, setEvents] = useState([]); 
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

  // カレンダースワイプ
  const [touchStart, setTouchStart] = useState(null);
  const onTouchStart = (e) => { setTouchStart(e.targetTouches[0].clientX); };
  const onTouchEnd = (e) => { if (!touchStart) return; const diff = touchStart - e.changedTouches[0].clientX; if (diff > 50) changeMonth(1); if (diff < -50) changeMonth(-1); };

  useEffect(() => { const init = async () => { await signInAnonymously(auth); }; init(); return onAuthStateChanged(auth, setUser); }, []);
  useEffect(() => {
    if (!user) return; 
    const unsubR = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rookies'), snap => { setRookies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(false); });
    const unsubE = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), snap => setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubS = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), docSnap => { if (docSnap.exists() && docSnap.data().memoOrder) setMemoOrder(docSnap.data().memoOrder); });
    return () => { unsubR(); unsubE(); unsubS(); };
  }, [user]);

  const projectList = useMemo(() => {
    const list = [...rookies];
    const weight = (r) => r === 'high' ? 3 : r === 'medium' ? 2 : 1;
    return list.sort((a, b) => {
      if (projectSortOrder === 'rank_desc') { const d = weight(b.projectRank) - weight(a.projectRank); if (d !== 0) return d; return (b.projectDate || "").localeCompare(a.projectDate || ""); }
      if (projectSortOrder === 'rank_asc') { const d = weight(a.projectRank) - weight(b.projectRank); if (d !== 0) return d; return (b.projectDate || "").localeCompare(a.projectDate || ""); }
      if (projectSortOrder === 'newest') return (b.projectDate || "").localeCompare(a.projectDate || "");
      if (projectSortOrder === 'oldest') return (a.projectDate || "").localeCompare(b.projectDate || "");
      return 0;
    });
  }, [rookies, projectSortOrder]);

  const memoList = useMemo(() => {
    let list = events.filter(e => getDaysDiff(e.date) <= 0).map(e => ({ id: e.id, type: 'event', name: e.name, content: e.note, rank: e.rank || 'medium', displayDate: e.date }));
    if (memoOrder.length > 0) {
      const ordered = [];
      const itemMap = new Map();
      list.forEach(i => itemMap.set(i.id, i));
      memoOrder.forEach(id => { if(itemMap.has(id)) { ordered.push(itemMap.get(id)); itemMap.delete(id); } });
      itemMap.forEach(i => ordered.push(i));
      return ordered;
    }
    return list.sort((a, b) => a.displayDate.localeCompare(b.displayDate));
  }, [events, memoOrder]);

  const changeMonth = (offset) => { const n = new Date(currentDate); n.setMonth(n.getMonth() + offset); setCurrentDate(n); };
  const handleSaveEvent = async (d, n, nt, r, id) => { if(!user) return; const data = { date:d, name:n, note:nt, rank:r }; if(id) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), data); } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { ...data, createdAt: serverTimestamp() }); } };
  const handleDeleteEvent = async (id) => { if(!user) return; await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id)); };
  const handleUpdateProject = async (id, cp, pd, pr) => { if(!user) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rookies', id), { currentProject: cp, projectDate: pd, projectRank: pr, projectUpdatedAt: serverTimestamp() }); };
  const handleAddLog = async (id, d, c, p) => { if(!user) return; const r = rookies.find(rk => rk.id === id); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rookies', id), { logs: [...(r.logs || []), { id: Date.now().toString(), date: d, content: c, project: p }], currentProject: p, projectUpdatedAt: serverTimestamp() }); };
  const handleDeleteLog = async (id, logId) => { if(!user) return; const r = rookies.find(rk => rk.id === id); const filteredLogs = r.logs.filter(log => log.id !== logId); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rookies', id), { logs: filteredLogs }); };
  const handleAddMember = async (n, d, c, p) => { if(!user) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rookies'), { name:n, joinDate:d, logs: c ? [{ id: Date.now().toString(), date: d, content: c, project: p }] : [], currentProject: p, createdAt: serverTimestamp(), projectUpdatedAt: serverTimestamp() }); };
  const handleDeleteMember = async (r) => { if(!user) return; if(window.confirm(`${r.name} さんを削除しますか？`)) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rookies', r.id)); setIsModalOpen(false); };
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
    try { if(!user) return; await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), { memoOrder: newOrder }, { merge: true }); } catch (e) { console.error(e); }
  };
  const getCalendarDays = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    return days;
  };
  
  // --- 一覧タブ用ロジック ---
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

  // --- スタイル定義 ---
  const getStatusColor = (daysDiff) => {
    if (daysDiff === null) return "bg-slate-100 text-slate-500 border-slate-200";
    if (daysDiff === 0) return "bg-orange-100 text-orange-800 border-orange-200"; // 本日
    if (daysDiff < 0) return "bg-amber-100 text-amber-800 border-amber-200"; // 未来
    if (daysDiff >= 14) return "bg-red-100 text-red-800 border-red-200"; // 2週間以上
    if (daysDiff >= 7) return "bg-yellow-100 text-yellow-800 border-yellow-200"; // 1週間以上
    return "bg-green-100 text-green-800 border-green-200"; // 順調
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20 sm:pb-0 flex flex-col">
      <header className="bg-white shadow sticky top-0 z-10 safe-area-top">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2 text-blue-600"><Users size={24} /><h1 className="text-lg font-bold text-slate-800">Rookie Manager</h1></div><button onClick={() => setIsAddMemberModalOpen(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-1 shadow-sm"><UserPlus size={16} /> 追加</button></div>
        <div className="flex max-w-6xl mx-auto px-4 gap-4 text-sm font-medium border-t overflow-x-auto hide-scrollbar">
          {['list', 'calendar', 'project', 'memo'].map(mode => <button key={mode} onClick={() => { setViewMode(mode); if(mode === 'project') setProjectSortOrder('rank_desc'); }} className={`py-3 flex-shrink-0 border-b-2 transition ${viewMode === mode ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>{mode === 'list' ? '一覧' : mode === 'calendar' ? '予定' : mode === 'project' ? '案件' : 'メモ'}</button>)}
        </div>
      </header>

      <main className={`max-w-6xl mx-auto w-full ${viewMode === 'calendar' ? 'p-0 flex-1 flex flex-col' : 'p-3 sm:p-4'}`}>
        {viewMode === 'list' && (
          <>
            <div className="flex gap-3 mb-4 items-center justify-between bg-white p-3 rounded-lg shadow-sm"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="名前検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-md text-sm" /></div>
            <div className="flex gap-2">
                <button onClick={() => setSortKey('daysAgo')} className={`px-3 py-2 text-xs rounded border flex items-center gap-1 ${sortKey === 'daysAgo' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-600'}`}><Clock size={14} /> ご無沙汰</button>
                <button onClick={() => setSortKey('recent')} className={`px-3 py-2 text-xs rounded border flex items-center gap-1 ${sortKey === 'recent' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-600'}`}><ListFilter size={14} /> 最近</button>
            </div></div>
            {todayRookies.length > 0 && (
              <div className="mb-4 bg-orange-500 text-white p-3 rounded-xl shadow-lg flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-full"><Bell size={20} className="animate-bounce" /></div><div><p className="text-xs font-bold opacity-90">本日のフォロー予定</p><p className="text-sm font-bold">{todayRookies.map(r => r.name).join(' さん、')} さん</p></div></div><Zap size={24} className="text-yellow-300 opacity-50" />
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {processedRookies.map((rookie) => (
                <div key={rookie.id} onClick={() => { setSelectedRookie(rookie); setIsModalOpen(true); }} className={`bg-white rounded-lg shadow-sm border overflow-hidden p-3 h-full flex flex-col active:scale-95 transition ${rookie.displayDaysDiff === 0 ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-[9px] text-slate-400 mb-0.5 flex items-center gap-0.5"><Clock size={9} /> 前: {rookie.lastPastMeetingDate || "未"}</div>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{rookie.name}</h3>
                    </div>
                    <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${getStatusColor(rookie.displayDaysDiff)}`}>
                      {rookie.displayDaysDiff === null ? '未' : rookie.displayDaysDiff === 0 ? '本日' : rookie.isDisplayFuture ? `あと${Math.abs(rookie.displayDaysDiff)}日` : `${rookie.displayDaysDiff}日前`}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center text-[10px] text-slate-500"><Calendar size={10} className="mr-1" /> <span className="font-medium truncate">{rookie.isDisplayFuture ? '次回' : '最新'}: {rookie.displayDate || "-"}</span></div>
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 flex-1">
                    <div className="flex items-center text-xs text-slate-700"><Briefcase size={12} className="inline mr-1 text-indigo-400 flex-shrink-0" /><span className="truncate">{rookie.currentProject || "案件なし"}</span></div>
                    <div className="flex items-center text-xs text-slate-600"><MessageSquare size={12} className="inline mr-1 text-slate-400 flex-shrink-0" /><span className="truncate">{rookie.logs?.length ? [...rookie.logs].sort((a,b)=>new Date(b.date)-new Date(a.date))[0].content : "記録なし"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {viewMode === 'calendar' && (
          <div className="bg-white flex flex-col flex-1 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="flex items-center justify-between p-4 border-b bg-slate-50"><button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ChevronLeft size={24} /></button><h2 className="text-lg font-bold text-slate-800">{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</h2><button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ChevronRight size={24} /></button></div>
            <div className="grid grid-cols-7 border-b text-center text-[10px] font-bold text-slate-500 bg-slate-50">{['日','月','火','水','木','金','土'].map((d,i) => <div key={d} className={`py-2 ${i===0?'text-red-400':i===6?'text-blue-400':''}`}>{d}</div>)}</div>
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px flex-1 overflow-y-auto">
              {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay())].map((_, i) => <div key={`empty-${i}`} className="bg-slate-50 min-h-[80px]"></div>)}
              {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                const ds = formatDate(d);
                const isT = new Date().toDateString() === d.toDateString();
                const dL = rookies.flatMap(r => (r.logs || []).filter(l => l.date === ds).map(l => ({ rN: r.name, rI: r.id })));
                const dE = events.filter(e => e.date === ds);
                return (
                  <div key={i} className={`bg-white min-h-[80px] p-0.5 flex flex-col ${isT ? 'bg-orange-50' : ''}`} onClick={() => { setSelectedEventDate(ds); setEditingEvent(null); setIsEventModalOpen(true); }}>
                    <span className={`text-[10px] font-bold mb-0.5 ${isT ? 'text-orange-600' : 'text-slate-400'}`}>{i+1}</span>
                    <div className="space-y-0.5 overflow-y-auto max-h-[80px] hide-scrollbar">
                      {dL.map((l, idx) => <div key={idx} onClick={(e) => { e.stopPropagation(); setSelectedRookie(rookies.find(r=>r.id===l.rI)); setIsModalOpen(true); }} className="text-[8px] px-1 py-0.5 rounded truncate leading-tight border bg-blue-100 text-blue-800 border-blue-200">{l.rN}</div>)}
                      {dE.map((e, idx) => <div key={idx} onClick={(eO) => { eO.stopPropagation(); setEditingEvent(e); setSelectedEventDate(ds); setIsEventModalOpen(true); }} className="text-[8px] px-1 py-0.5 rounded truncate cursor-pointer leading-tight border bg-green-100 text-green-800 border-green-200">{e.name}</div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'project' && (
          <div className="grid grid-cols-2 gap-3 pb-20 animate-fade-in">
            {projectList.map(r => <ProjectCard key={r.id} item={r} onClick={(rk) => { setEditingProjectRookie(rk); setIsProjectEditOpen(true); }} />)}
          </div>
        )}

        {viewMode === 'memo' && (
          <div className="pb-24 space-y-2 animate-fade-in">
            <div className="flex justify-between items-center mb-4 px-1"><h2 className="font-bold text-slate-700 text-lg">統合メモ (未来の予定)</h2><button onClick={() => setIsReorderingMemo(!isReorderingMemo)} className={`px-4 py-1.5 text-xs rounded-full font-bold shadow-sm transition-all ${isReorderingMemo ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border'}`}>{isReorderingMemo?'完了':'並び替え'}</button></div>
            {memoList.length ? memoList.map(item => <MemoListItem key={item.id} item={item} isReordering={isReorderingMemo} onMoveUp={(id) => handleMoveItem(id, -1)} onMoveDown={(id) => handleMoveItem(id, 1)} onDelete={handleDeleteEvent} />) : <div className="p-16 text-center text-slate-400 font-bold italic bg-white rounded-2xl border border-dashed">予定はありません</div>}
          </div>
        )}
      </main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-40 safe-area-bottom shadow-lg">
        <button onClick={() => setViewMode('list')} className={`flex flex-col items-center flex-1 h-full justify-center transition-colors ${viewMode==='list'?'text-blue-600 font-bold':'text-slate-400'}`}><Users size={22}/><span className="text-[10px] mt-1">一覧</span></button>
        <button onClick={() => setViewMode('calendar')} className={`flex flex-col items-center flex-1 h-full justify-center transition-colors ${viewMode==='calendar'?'text-blue-600 font-bold':'text-slate-400'}`}><Calendar size={22}/><span className="text-[10px] mt-1">予定</span></button>
        <button onClick={() => { setViewMode('project'); setProjectSortOrder('rank_desc'); }} className={`flex flex-col items-center flex-1 h-full justify-center transition-colors ${viewMode==='project'?'text-blue-600 font-bold':'text-slate-400'}`}><Briefcase size={22}/><span className="text-[10px] mt-1">案件</span></button>
        <button onClick={() => setViewMode('memo')} className={`flex flex-col items-center flex-1 h-full justify-center transition-colors ${viewMode==='memo'?'text-blue-600 font-bold':'text-slate-400'}`}><StickyNote size={22}/><span className="text-[10px] mt-1">メモ</span></button>
      </nav>

      <MemberDetailModal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} rookie={selectedRookie} onAddLog={handleAddLog} onDeleteLog={handleDeleteLog} onDeleteMember={handleDeleteMember} />
      <AddMemberModal isOpen={isAddMemberModalOpen} onClose={()=>setIsAddMemberModalOpen(false)} onAddMember={handleAddMember} />
      <ProjectEditModal isOpen={isProjectEditOpen} onClose={()=>setIsProjectEditOpen(false)} rookie={editingProjectRookie} onSave={handleUpdateProject} />
      <AddEventModal isOpen={isEventModalOpen} onClose={()=>setIsEventModalOpen(false)} date={selectedEventDate} event={editingEvent} onSave={handleSaveEvent} onDelete={handleDeleteEvent} />
    </div>
  );
};

// --- Appコンポーネント (エラー境界で保護) ---
const App = () => (
  <ErrorBoundary>
    <MainApp />
  </ErrorBoundary>
);

export default App;