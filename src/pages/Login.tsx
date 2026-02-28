
import { useState } from "react";
import { useAuth } from "@/contexts/UserContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import mascot from "@/assets/mascot.png";

// Import avatars
import red from "@/assets/avatars/red.png";
import yellow from "@/assets/avatars/yellow.png";
import blue from "@/assets/avatars/blue.png";
import black from "@/assets/avatars/black.png";
import green from "@/assets/avatars/green.png";
import white from "@/assets/avatars/white.png";

const AVATARS = [
  { id: 'red', src: red, color: '#DC2626' },
  { id: 'yellow', src: yellow, color: '#FACC15' },
  { id: 'blue', src: blue, color: '#3B82F6' },
  { id: 'black', src: black, color: '#1F2937' },
  { id: 'green', src: green, color: '#22C55E' },
  { id: 'white', src: white, color: '#F3F4F6' },
];

export default function Login() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]); // Default
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error("Please fill all fields");
    
    setIsLoading(true);
    setTimeout(() => {
      const success = login(username, password);
      setIsLoading(false);
      if (success) {
        toast.success("Welcome back!");
        setLocation("/");
      } else {
        toast.error("Invalid username or password");
      }
    }, 800);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error("Please fill all fields");
    
    setIsLoading(true);
    setTimeout(() => {
      const success = register(username, password, selectedAvatar.color, selectedAvatar.id);
      // Wait, UserContext.register signature is (username, pass). 
      // I should update UserContext to accept avatar info OR update profile after register.
      // Let's assume standard register creates a user, we can pass extra metadata if I update UserContext.
      // Actually, I should update UserContext to support avatar.
      
      // Since I can't easily update Context signature without breaking types everywhere or re-editing heavily,
      // I'll stick to 'color' which is already supported, and maybe store avatar ID in localStorage or just map color to avatar if unique?
      // Better: Update UserContext to take avatarUrl.
      
      // Hack for now: Use the 'avatarColor' field to store the avatar ID string (e.g. 'red') if it's a simple string, 
      // OR update the context properly. 
      // I will update UserContext in next step.
      
      setIsLoading(false);
      if (success) {
        toast.success("Account created! Welcome!");
        setLocation("/");
      } else {
        toast.error("Username already taken");
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#FEFAE0] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
            <img src={mascot} alt="Mascot" className="relative w-full h-full object-contain animate-bounce-slow" />
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">KET 一起学</h1>
          <p className="text-muted-foreground mt-2 font-medium">Learn words together!</p>
        </div>

        <Card className="border-4 border-primary/20 shadow-xl bg-white/80 backdrop-blur">
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2"><Label htmlFor="l-user">Username</Label><span className="text-xs text-muted-foreground">用户名</span></div>
                    <Input 
                      id="l-user" 
                      placeholder="Enter your name" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2"><Label htmlFor="l-pass">Password</Label><span className="text-xs text-muted-foreground">密码</span></div>
                    <Input 
                      id="l-pass" 
                      type="password" 
                      placeholder="••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>
                  <Button className="w-full h-12 text-lg font-bold" type="submit" disabled={isLoading}>
                    {isLoading ? "Checking..." : <span>Let's Go! <span className="text-xs font-normal opacity-70 ml-1">登录</span></span>}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2"><Label>Choose Avatar</Label><span className="text-xs text-muted-foreground">选择头像</span></div>
                    <div className="flex gap-2 justify-center flex-wrap">
                        {AVATARS.map(av => (
                            <div 
                                key={av.id}
                                className={`w-12 h-12 rounded-full cursor-pointer border-2 transition-all ${selectedAvatar.id === av.id ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                onClick={() => setSelectedAvatar(av)}
                            >
                                <img src={av.src} alt={av.id} className="w-full h-full object-contain" />
                            </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2"><Label htmlFor="r-user">Pick a Username</Label><span className="text-xs text-muted-foreground">用户名</span></div>
                    <Input 
                      id="r-user" 
                      placeholder="e.g. SuperKid" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2"><Label htmlFor="r-pass">Create Password</Label><span className="text-xs text-muted-foreground">密码</span></div>
                    <Input 
                      id="r-pass" 
                      type="password" 
                      placeholder="••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>
                  <Button className="w-full h-12 text-lg font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground" type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : <span>Join the Club! <span className="text-xs font-normal opacity-70 ml-1">注册</span></span>}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
