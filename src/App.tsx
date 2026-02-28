
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Learn from "@/pages/Learn";
import Test from "@/pages/Test";
import Stats from "@/pages/Stats";
import Mistakes from "@/pages/Mistakes";
import Leaderboard from "@/pages/Leaderboard";
import VocabManager from "@/pages/VocabManager";
import Review from "@/pages/Review";

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/learn" component={Learn} />
        <Route path="/test" component={Test} />
        <Route path="/stats" component={Stats} />
        <Route path="/mistakes" component={Mistakes} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/vocab" component={VocabManager} />
        <Route path="/review" component={Review} />
        <Route>
          {/* 404 Fallback */}
          <div className="min-h-screen flex items-center justify-center">
            Page Not Found
          </div>
        </Route>
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <div className="bg-[#FEFAE0] min-h-screen font-sans text-[#023047]">
              <AppRouter />
            </div>
          </TooltipProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
