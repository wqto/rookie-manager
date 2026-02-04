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

// 日付の差分を計算（未来はマイナス値、過去はプラス値）
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
    <div onClick={() => onClick && onClick(item)} className={`${rankStyle} border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group break-words flex flex-col h-full`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-slate-800 line-clamp-1 flex items-center gap-1 text-sm"><Users size={12} className="text-slate-500 flex-shrink-0"/>{item.name}</h3>
        {rankLabel && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${rankLabel.color}`}>{rankLabel.text}</span>}
      </div>
      <div className="flex-1">{item.currentProject ? <p className="text-xs text-slate-700 whitespace-pre-wrap">{item.currentProject}</p> : <p className="text-xs text-slate-400 italic">案件情報なし</p>}</div>
      <div className="mt-2 pt-2 border-t border-black/5 flex justify-between items-center text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><Calendar size={10} className="text-slate-400"/> 営業日: <span className="font-bold">{item.projectDate || "未設定"}</span></span>
        {onClick && <Edit2 size={10} className="opacity-50" />}
      </div>
    </div>
  );
};

// --- サブコンポーネント: メモカード（未来の予定のみ） ---
const MemoListItem = ({ item, isReordering, onMoveUp, onMoveDown, onDelete }) => {
  const daysDiff = getDaysDiff(item.displayDate);
  const isToday = daysDiff === 0;

  const getRankBadge = (rank) => {
    switch(rank) {
      case 'high': return <span className="bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold">高</span>;
      case 'medium': return <span className="bg-indigo-100 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold">中</span>;
      case 'low': return <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">低</span>;
      default: return null;
    }
  };

  return (
    <div className={`p-3 rounded-lg border shadow-sm mb-2 transition-all relative group bg-green-50 border-green-200 ${isToday ? 'ring-2 ring-orange-300' : ''} ${isReordering ? 'border-dashed border-slate-400' : ''}`}>
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
      <div className="pl-4 border-l-2 border-slate-200 ml-1 pr-6"><p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content}</p></div>
      {!isReordering && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
      )}
    </div>
  );
};

// --- サブコンポーネント: カレンダー予定 モーダル ---
const AddEventModal = ({ isOpen, onClose, date, event, onSave, onDelete }) => {
  const [eventDate, setEventDate] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [rank, setRank] = useState("medium");

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setEventDate(event.date || date);
        setName(event.name || "");
        setNote(event.note || "");
        setRank(event.rank || "medium");
      } else {
        setEventDate(date);
        setName("");
        setNote("");
        setRank("medium");
      }
    }
  }, [isOpen, event, date]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 text-left">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[70vh] sm:w-full sm:max-w-md sm:rounded-xl shadow-2xl p-6 relative z-10 flex flex-col animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">{event ? '予定の編集' : '予定の追加'}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(eventDate, name, note, rank, event?.id); onClose(); }} className="flex-1 flex flex-col space-y-4">
          <div><label className="block text-xs font-bold text-green-700 mb-1">日付</label><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full p-2 border rounded-lg font-bold" required /></div>
          <div><label className="block text-xs font-bold text-green-700 mb-1">名前</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="名前を入力..." className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-400 outline-none" required /></div>
          <div>
            <label className="block text-xs font-bold text-green-700 mb-2">重要度</label>
            <div className="flex gap-2">
              {['high', 'medium', 'low'].map(r => (
                <label key={r} className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-colors ${rank === r ? 'bg-green-100 border-green-500 text-green-700 font-bold' : 'border-slate-200 text-slate-500'}`}>
                  <input type="radio" name="rank" value={r} checked={rank === r} onChange={(e) => setRank(e.target.value)} className="hidden" /> {r === 'high' ? '高' : r === 'medium' ? '中' : '低'}
                </label>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col"><label className="block text-xs font-bold text-green-700 mb-1">メモ</label><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="内容を入力..." className="w-full flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-400 outline-none resize-none" style={{ minHeight: '100px' }} /></div>
          <div className="flex gap-3">
             {event && <button type="button" onClick={() => { if(window.confirm("削除しますか？")) { onDelete(event.id); onClose(); } }} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl hover:bg-red-100 border border-red-100"><Trash2 size={20} /></button>}
             <button type="submit" className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-bold text-lg shadow-md">{event ? '更新する' : '追加する'}</button>
          </div>
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
  const [projectSortOrder, setProjectSortOrder] = useState('rank_desc'); // 最初から「高」
  const [isReorderingMemo, setIsReorderingMemo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // カレンダースワイプ
  const [touchStart, setTouchStart] = useState(null);
  const onTouchStart = (e) => { setTouchStart(e.targetTouches[0].clientX); };
  const onTouchEnd = (e) => { 
    if (!touchStart) return;
    const distance = touchStart - e.changedTouches[0].clientX;
    if (distance > 50) changeMonth(1);
    if (distance < -50) changeMonth(-1);
  };

  useEffect(() => { 
    const initAuth = async () => { await signInAnonymously(auth); }; 
    initAuth(); 
    const unsubscribe = onAuthStateChanged(auth, setUser); 
    return () => unsubscribe(); 
  }, []);

  useEffect(() => {
    if (!user) return; 
    const unsubR = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rookies'), snap => { setRookies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(false); });
    const unsubE = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), snap => setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubS = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), docSnap => { if (docSnap.exists() && docSnap.data().memoOrder) setMemoOrder(docSnap.data().memoOrder); });
    return () => { unsubR(); unsubE(); unsubS(); };
  }, [user]);

  const projectList = useMemo(() => {
    const list = [...rookies];
    const getRankWeight = (rank) => rank === 'high' ? 3 : rank === 'medium' ? 2 : 1;
    return list.sort((a, b) => {
      if (projectSortOrder === 'rank_desc') { 
        const diff = getRankWeight(b.projectRank) - getRankWeight(a.projectRank); 
        if (diff !== 0) return diff; 
        return (b.projectDate || "").localeCompare(a.projectDate || ""); 
      }
      return (b.projectUpdatedAt?.seconds || 0) - (a.projectUpdatedAt?.seconds || 0);
    });
  }, [rookies, projectSortOrder]);

  const memoList = useMemo(() => {
    // 未来（今日以降）の予定のみ抽出
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

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const handleSaveEvent = async (date, name, note, rank, id) => { 
    if(!user) return; 
    const data = { date, name, note, rank }; 
    if(id) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), data); } 
    else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { ...data, createdAt: serverTimestamp() }); } 
  };
  
  const handleDeleteEvent = async (id) => { if(!user) return; await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id)); };
  const handleUpdateProjectOnly = async (id, currentProject, projectDate, projectRank) => { if(!user) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rookies', id), { currentProject, projectDate, projectRank, projectUpdatedAt: serverTimestamp() }); };
  const handleAddMember = async (name, joinDate, content, project) => { if(!user) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rookies'), { name, joinDate, logs: content ? [{ id: Date.now().toString(), date: joinDate, content, project }] : [], currentProject: project, createdAt: serverTimestamp(), projectUpdatedAt: serverTimestamp() }); };
  const handleDeleteMember = async (r) => { if(!user) return; if(window.confirm(`${r.name} さんを削除しますか？`)) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rookies', r.id)); setIsModalOpen(false); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20 sm:pb-0 flex flex-col">
      <header className="bg-white shadow sticky top-0 z-10 safe-area-top">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2 text-blue-600"><Users size={24} /><h1 className="text-lg font-bold text-slate-800">Rookie Manager</h1></div><button onClick={() => setIsAddMemberModalOpen(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-1"><UserPlus size={16} /> 追加</button></div>
        <div className="flex max-w-6xl mx-auto px-4 gap-4 text-sm font-medium border-t overflow-x-auto hide-scrollbar">
          {['list', 'calendar', 'project', 'memo'].map(mode => <button key={mode} onClick={() => { setViewMode(mode); if(mode === 'project') setProjectSortOrder('rank_desc'); }} className={`py-3 flex-shrink-0 border-b-2 transition ${viewMode === mode ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>{mode === 'list' ? '一覧' : mode === 'calendar' ? '予定' : mode === 'project' ? '案件' : 'メモ'}</button>)}
        </div>
      </header>

      <main className={`max-w-6xl mx-auto w-full ${viewMode === 'calendar' ? 'p-0 flex-1 flex flex-col' : 'p-3 sm:p-4'}`}>
        {viewMode === 'list' && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {rookies.map(r => (
              <div key={r.id} onClick={() => { setSelectedRookie(r); setIsModalOpen(true); }} className="bg-white rounded-lg shadow-sm border p-3 h-full flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 truncate">{r.name}</h3>
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-xs text-slate-700 truncate"><Briefcase size={12} className="inline mr-1 text-indigo-400" />{r.currentProject || "案件なし"}</div>
                  <div className="text-xs text-slate-500 truncate"><MessageSquare size={12} className="inline mr-1 text-slate-400" />{r.logs?.length ? [...r.logs].sort((a,b)=>new Date(b.date)-new Date(a.date))[0].content : "記録なし"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="bg-white flex flex-col flex-1 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ChevronLeft size={24} /></button>
              <h2 className="text-lg font-bold text-slate-800">{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</h2>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ChevronRight size={24} /></button>
            </div>
            <div className="grid grid-cols-7 border-b text-center text-[10px] font-bold text-slate-500 bg-slate-50">{['日','月','火','水','木','金','土'].map((d,i) => <div key={d} className={`py-2 ${i===0?'text-red-400':i===6?'text-blue-400':''}`}>{d}</div>)}</div>
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px flex-1">
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
          <div className="grid grid-cols-2 gap-3 auto-rows-max">
            {projectList.map(r => <ProjectCard key={r.id} item={r} onClick={() => { setEditingProjectRookie(r); setIsProjectEditOpen(true); }} />)}
          </div>
        )}

        {viewMode === 'memo' && (
          <div className="pb-20">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-slate-700">統合メモ（未来のみ）</h2><button onClick={() => setIsReorderingMemo(!isReorderingMemo)} className={`px-3 py-1.5 text-xs rounded-lg font-bold ${isReorderingMemo ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{isReorderingMemo ? '完了' : '並び替え'}</button></div>
            <div className="space-y-2">{memoList.length ? memoList.map(item => <MemoListItem key={item.id} item={item} isReordering={isReorderingMemo} onDelete={handleDeleteEvent} />) : <div className="p-8 text-center text-slate-400 font-bold italic">未来の予定はありません</div>}</div>
          </div>
        )}
      </main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 z-40">
        <button onClick={() => setViewMode('list')} className={`flex flex-col items-center flex-1 h-full justify-center ${viewMode === 'list' ? 'text-blue-600' : 'text-slate-400'}`}><Users size={20} /><span className="text-[10px] mt-1 font-bold">一覧</span></button>
        <button onClick={() => setViewMode('calendar')} className={`flex flex-col items-center flex-1 h-full justify-center ${viewMode === 'calendar' ? 'text-blue-600' : 'text-slate-400'}`}><Calendar size={20} /><span className="text-[10px] mt-1 font-bold">予定</span></button>
        <button onClick={() => { setViewMode('project'); setProjectSortOrder('rank_desc'); }} className={`flex flex-col items-center flex-1 h-full justify-center ${viewMode === 'project' ? 'text-blue-600' : 'text-slate-400'}`}><Briefcase size={20} /><span className="text-[10px] mt-1 font-bold">案件</span></button>
        <button onClick={() => setViewMode('memo')} className={`flex flex-col items-center flex-1 h-full justify-center ${viewMode === 'memo' ? 'text-blue-600' : 'text-slate-400'}`}><StickyNote size={20} /><span className="text-[10px] mt-1 font-bold">メモ</span></button>
      </nav>

      <AddMemberModal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} onAddMember={handleAddMember} />
      <ProjectEditModal isOpen={isProjectEditOpen} onClose={() => setIsProjectEditOpen(false)} rookie={editingProjectRookie} onSave={handleUpdateProjectOnly} />
      <AddEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} date={selectedEventDate} event={editingEvent} onSave={handleSaveEvent} onDelete={handleDeleteEvent} />
    </div>
  );
};

export default App;