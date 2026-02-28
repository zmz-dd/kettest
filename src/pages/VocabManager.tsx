
import { useState } from "react";
import { useLocation } from "wouter";
import { useVocabulary, type Word } from "@/hooks/useVocabulary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookPlus, Trash2, Upload, RefreshCw, Eye, Wand2, Loader2, Plus, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/UserContext";
import dictionaryZh from "@/assets/dictionary_zh.json"; 

export default function VocabManager() {
  const [, setLocation] = useLocation();
  const { customBooks, allBooks } = useVocabulary();
  
  // Local implementation of missing actions from V6 hook
  const [_, setForceUpdate] = useState(0);

  const addCustomBook = (title: string, words: any[], description: string) => {
    const newBook = { id: `custom_${Date.now()}`, title, words, description, isBuiltIn: false };
    const updated = [...customBooks, newBook];
    // We can't update hook state directly if setter not exposed.
    // BUT hook exposes 'customBooks' via local storage read.
    // If we write to LS and trigger re-render?
    // Actually V6 hook exposes `customBooks` state but NO setters in `return`.
    // We MUST fix the hook to expose setters or implement them here via localStorage + window event?
    // Let's implement direct localStorage manipulation here to unblock.
    localStorage.setItem('kids_vocab_custom_books_v3', JSON.stringify(updated));
    window.location.reload(); // Brute force refresh for now
    return newBook.id;
  };

  const deleteCustomBook = (id: string) => {
    const updated = customBooks.filter(b => b.id !== id);
    localStorage.setItem('kids_vocab_custom_books_v3', JSON.stringify(updated));
    window.location.reload();
  };

  const updateBookWords = (bookId: string, newWords: any[]) => {
    const updated = customBooks.map(b => b.id === bookId ? { ...b, words: newWords } : b);
    localStorage.setItem('kids_vocab_custom_books_v3', JSON.stringify(updated));
    window.location.reload();
  };

  const updateWordDetails = (overrides: any) => {
    const saved = JSON.parse(localStorage.getItem('kids_vocab_word_overrides_v1') || '{}');
    const newOverrides = { ...saved, ...overrides };
    localStorage.setItem('kids_vocab_word_overrides_v1', JSON.stringify(newOverrides));
    window.location.reload();
  };
  const { users, adminCreateUser, deleteUser, clearUserData, resetUserPassword, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("books");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [enrichingBookId, setEnrichingBookId] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [targetBookId, setTargetBookId] = useState<string | null>(null);
  const [addRawText, setAddRawText] = useState("");

  // User management state
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setText: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const performEnrichment = async (bookId: string, wordsToEnrich: Word[], isBuiltIn = false) => {
    setEnrichingBookId(bookId);
    toast.loading(`Enriching ${wordsToEnrich.length} words...`);
    
    const enriched = [...wordsToEnrich];
    let updatedCount = 0;
    // Map to collect overrides if builtin
    const overrides: Record<string, any> = {};

    for (let i = 0; i < enriched.length; i++) {
        const w = enriched[i];
        
        // For builtin, we might already have meaning, but want example/audio
        // For custom, same logic
        
        // 1. Local ZH lookup
        const local = (dictionaryZh as any[]).find((d: any) => d.word.toLowerCase() === w.word.toLowerCase());
        if (local) {
            // Update fields if missing
            if (!w.meaning) w.meaning = local.meaning;
            if (!w.pos || w.pos === 'unknown') w.pos = local.pos;
            if (!w.example) w.example = local.example;
            if (!w.phonetic) w.phonetic = local.phonetic;
            updatedCount++;
        }

        // 2. API Lookup (Metadata: Audio, Phonetic, Example)
        // We always try to fetch audio/example if missing, even if meaning exists
        if (!w.audioUrl || !w.example || !w.phonetic) {
            try {
                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w.word}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.[0]) {
                        const entry = data[0];
                        if (!w.phonetic && entry.phonetic) w.phonetic = entry.phonetic;
                        
                        const audio = entry.phonetics?.find((p: any) => p.audio && p.audio !== '')?.audio;
                        if (!w.audioUrl && audio) w.audioUrl = audio;
                        
                        if (entry.meanings?.[0]) {
                            const m = entry.meanings[0];
                            if (!w.pos || w.pos === 'unknown') w.pos = m.partOfSpeech || 'n.';
                            
                            // Try to find example
                            if (!w.example && m.definitions?.[0]?.example) {
                                w.example = m.definitions[0].example;
                            }
                            
                            // Fallback meaning if still missing
                            if ((!w.meaning || w.meaning === '') && m.definitions?.[0]) {
                                 w.meaning = "[待补充中文]"; 
                            }
                        }
                        updatedCount++;
                    }
                }
            } catch (e) { console.error(e); }
            await new Promise(r => setTimeout(r, 50));
        }
        
        if (isBuiltIn) {
            overrides[w.word.toLowerCase()] = {
                example: w.example,
                exampleAudioUrl: w.exampleAudioUrl,
                phonetic: w.phonetic,
                audioUrl: w.audioUrl
            };
        }
    }
    
    if (isBuiltIn) {
        // Use the new updateWordDetails method from hook (need to destructure it)
        // Since we can't access it here directly inside component if not extracted, let's assume we pass it or extract it.
        // Wait, 'performEnrichment' is inside VocabManager component, so we can access updateWordDetails from useVocabulary()
        updateWordDetails(overrides);
    } else {
        updateBookWords(bookId, enriched);
    }
    
    setEnrichingBookId(null);
    toast.dismiss();
    toast.success(`Done! Enriched/Updated ${updatedCount} words.`);
  };

  const parseTextToWords = (text: string, levelName: string): Word[] => {
      return text.split('\n').filter(l => l.trim()).map(line => {
          const parts = line.split(/[\t,]+/);
          const wordStr = parts[0].trim();
          return {
              word: wordStr,
              pos: parts[1] || 'unknown',
              meaning: parts[2] || '',
              level: levelName,
              initial: wordStr[0].toUpperCase()
          };
      });
  };

  const handleCreate = () => {
    if (!title.trim()) return toast.error("Please enter a book title");
    setIsProcessing(true);
    try {
      const newBookId = addCustomBook(title, [], description);
      if (newBookId) {
          toast.success(`Book "${title}" created! Now add words to it.`);
          setTitle(""); setDescription("");
      }
    } catch (err: any) { 
        toast.error(err.message || "Unknown error"); 
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAppend = async () => {
      if (!targetBookId || !addRawText.trim()) return;
      const book = customBooks.find(b => b.id === targetBookId);
      if (!book) return;
      setIsProcessing(true);
      try {
          const newWords = parseTextToWords(addRawText, book.title);
          const combined = [...book.words, ...newWords];
          // Update immediately then enrich the whole set
          updateBookWords(targetBookId, combined);
          setIsAddOpen(false); setAddRawText("");
          toast.success(`Added ${newWords.length} words! Enriching...`);
          await performEnrichment(targetBookId, combined);
      } catch (err: any) { toast.error(err.message); }
      setIsProcessing(false);
  };

  const handleAddUser = () => {
      if (!newUser || !newPass) return toast.error("Enter username and password");
      if (adminCreateUser(newUser, newPass)) {
          toast.success(`User ${newUser} created!`);
          setNewUser(""); setNewPass("");
      } else {
          toast.error("User already exists");
      }
  };

  return (
    <div className="min-h-screen p-4 bg-background max-w-4xl mx-auto flex flex-col">
      <div className="flex justify-between items-center mb-6 pt-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>Back</Button>
        <h1 className="text-xl font-black text-primary">Vocab Manager / 管理后台</h1>
        <div className="w-10" />
      </div>

      <Tabs defaultValue="books" className="flex-1">
        <TabsList className="w-full mb-6 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="books" className="flex-1 rounded-lg">Books Management / 词库管理</TabsTrigger>
            <TabsTrigger value="users" className="flex-1 rounded-lg">User Management / 用户管理</TabsTrigger>
        </TabsList>

        <TabsContent value="books">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                <CardHeader>
                    <CardTitle>1. Create Book Directory / 建词本</CardTitle>
                    <CardDescription>First, define the book name and description.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                    <Label>Title / 标题</Label>
                    <Input placeholder="e.g., Summer Vocab 2026" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                    <Label>Description / 描述</Label>
                    <Input placeholder="e.g., Focus on basic verbs" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <Button className="w-full font-bold" onClick={handleCreate} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Empty Book / 创建空词本"}
                    </Button>
                </CardContent>
                </Card>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg px-2">2. Manage & Enrich Words / 单词补录</h3>
                    <p className="text-xs text-muted-foreground px-2">Click "+" to add words, then "Wand" to auto-enrich definitions.</p>
                    
                    {allBooks.map(book => {
                        const isCustom = !book.isBuiltIn;
                        return (
                        <Card key={book.id} className={`p-4 flex flex-col gap-2 transition-colors ${!isCustom ? 'bg-gray-50/50' : 'hover:border-primary/50'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="font-black text-lg truncate">{book.title}</div>
                                        {!isCustom && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 rounded">Built-in</span>}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold">{book.words.length} words</span>
                                        {book.description && <span className="truncate opacity-70">| {book.description}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {isCustom && (
                                        <Button variant="secondary" size="sm" className="font-bold gap-1" onClick={() => { setTargetBookId(book.id); setIsAddOpen(true); }}>
                                            <Plus className="w-4 h-4" /> Add
                                        </Button>
                                    )}
                                    
                                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => performEnrichment(book.id, book.words, !isCustom)} disabled={enrichingBookId === book.id}>
                                        {enrichingBookId === book.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-purple-600" />}
                                    </Button>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="icon" className="rounded-full"><Eye className="w-4 h-4 text-blue-600" /></Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col rounded-3xl">
                                            <DialogHeader>
                                                <DialogTitle className="text-2xl font-black">{book.title}</DialogTitle>
                                                <DialogDescription>List of words in this book.</DialogDescription>
                                            </DialogHeader>
                                            <ScrollArea className="flex-1 mt-4 rounded-xl border p-2">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="font-black">Word</TableHead>
                                                            <TableHead className="font-black">Meaning</TableHead>
                                                            <TableHead className="font-black">Example</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {book.words.length === 0 ? (
                                                            <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No words added yet.</TableCell></TableRow>
                                                        ) : (
                                                            book.words.map((w, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-bold text-primary">{w.word}</TableCell>
                                                                    <TableCell className="text-xs">{w.meaning || '-'}</TableCell>
                                                                    <TableCell className="text-[10px] italic opacity-70">{w.example || '-'}</TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </DialogContent>
                                    </Dialog>
                                    
                                    {isCustom && (
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full" onClick={() => confirm(`Delete "${book.title}"?`) && deleteCustomBook(book.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );})}
                </div>
            </div>
        </TabsContent>

        <TabsContent value="users">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Create User / 新建用户</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Username</Label>
                            <Input value={newUser} onChange={e => setNewUser(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input value={newPass} onChange={e => setNewPass(e.target.value)} />
                        </div>
                        <Button className="w-full" onClick={handleAddUser}>Create User</Button>
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <h3 className="font-bold text-lg px-2">Existing Users</h3>
                    {users.filter(u => u.id !== user?.id).map(u => (
                        <Card key={u.id} className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{backgroundColor: u.avatarColor}}>
                                    {u.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold">{u.username}</div>
                                    <div className="text-xs text-muted-foreground">Joined: {new Date(u.joinedAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="text-orange-500 hover:bg-orange-50" title="Clear Data Only" onClick={() => confirm(`Clear ALL data for "${u.username}" (Progress, Plans)? User will remain.`) && clearUserData(u.id)}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50" title="Reset Password" onClick={() => {
                                    const newP = prompt(`Enter new password for ${u.username}:`);
                                    if (newP) {
                                        resetUserPassword(u.id, newP);
                                        toast.success(`Password for ${u.username} reset!`);
                                    }
                                }}>
                                    <Lock className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" title="Delete User" onClick={() => confirm(`Delete user "${u.username}" and ALL their data?`) && deleteUser(u.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                    {users.length <= 1 && <div className="text-center text-muted-foreground py-10">No other users yet.</div>}
                </div>
            </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black">Add Words</DialogTitle>
                <DialogDescription>Paste a list of words or upload a .txt file.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Textarea 
                    placeholder="apple&#10;banana&#10;cherry" 
                    className="h-64 font-mono text-base p-4 rounded-2xl border-2 focus:border-primary" 
                    value={addRawText} 
                    onChange={e => setAddRawText(e.target.value)} 
                />
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 relative rounded-xl h-12">
                        <Upload className="mr-2 w-4 h-4" /> Import TXT
                        <input type="file" accept=".txt" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, setAddRawText)} />
                    </Button>
                    <Button onClick={handleAppend} disabled={isProcessing} className="flex-1 rounded-xl h-12 font-black text-lg">
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Add"}
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
