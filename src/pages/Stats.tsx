
import { useLocation } from "wouter";
import { useVocabulary } from "@/hooks/useVocabulary";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Target, BookOpen, Star } from "lucide-react";

export default function Stats() {
  const [, setLocation] = useLocation();
  const { stats, progress, allBooks, plan } = useVocabulary();

  if (!stats) return <div className="p-10 text-center">Loading stats...</div>;

  // Calculate mastered and byBook breakdown locally since V6 stats object is simpler
  const masteredCount = Object.values(progress).filter(p => p.status === 'mastered').length;
  // stats.learnedUnique is "Learning + Mastered" (status !== 'new')
  const learningCount = stats.learnedUnique - masteredCount; 
  const newCount = stats.totalWords - stats.learnedUnique;

  const pieData = [
    { name: 'Mastered (掌握)', value: masteredCount, color: '#FB8500' }, 
    { name: 'Learning (学习中)', value: learningCount, color: '#FFB703' }, 
    { name: 'New (未学)', value: newCount, color: '#E5E7EB' }, 
  ];

  // Calculate per-book stats
  const byBookDetailed = allBooks.map(book => {
      const bookWords = book.words;
      const total = bookWords.length;
      const learned = bookWords.filter(w => progress[w.word] && progress[w.word].status !== 'new').length;
      const mastered = bookWords.filter(w => progress[w.word] && progress[w.word].status === 'mastered').length;
      return { id: book.id, title: book.title, total, learned, mastered };
  });

  return (
    <div className="min-h-screen p-6 bg-background max-w-md mx-auto">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')}><ChevronLeft /></Button>
        <h1 className="text-2xl font-black text-primary">Learning Progress</h1>
        <div className="w-10" />
      </div>

      <div className="space-y-8">
        {/* Overall Progress */}
        <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
          <div className="p-6 text-center">
            <h2 className="text-lg font-black text-foreground mb-4 flex items-center justify-center gap-2">
                <Target className="w-5 h-5 text-accent" /> Overall Mastery
            </h2>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}
                    </Pie>
                    <Tooltip />
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 p-3 rounded-2xl"><div className="text-2xl font-black text-secondary">{stats.learnedUnique}</div><div className="text-[10px] font-bold text-muted-foreground uppercase">Learned</div></div>
                <div className="bg-gray-50 p-3 rounded-2xl"><div className="text-2xl font-black text-accent">{masteredCount}</div><div className="text-[10px] font-bold text-muted-foreground uppercase">Mastered</div></div>
            </div>
          </div>
        </Card>

        {/* By Book Breakdown */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-primary px-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Book Details
          </h2>
          {byBookDetailed.map((data) => (
            <Card key={data.id} className="p-6 rounded-3xl border-none shadow-md bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="font-black text-lg text-foreground block">{data.title}</span>
                    <span className="text-xs font-bold text-muted-foreground">{data.total} Total Words</span>
                </div>
                <div className="text-right">
                    <span className="text-xl font-black text-primary">{Math.round((data.learned / Math.max(1, data.total)) * 100)}%</span>
                </div>
              </div>
              
              <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                        <span>Learned</span>
                        <span>{data.learned} words</span>
                    </div>
                    <Progress value={(data.learned / Math.max(1, data.total)) * 100} className="h-2 bg-gray-100" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-accent uppercase">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> Mastered</span>
                        <span>{data.mastered} words</span>
                    </div>
                    <Progress value={(data.mastered / Math.max(1, data.total)) * 100} className="h-2 bg-orange-50 [&>div]:bg-orange-400" />
                  </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
