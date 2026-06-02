import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, BarChart3, Users, ArrowRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  { icon: BarChart3, title: 'Finance Intelligence', desc: 'Real-time spend, budgets and forecasts with AI-driven insights.' },
  { icon: Users, title: 'Team Collaboration', desc: 'Live chat, mentions and presence so finance and ops move as one.' },
  { icon: Sparkles, title: 'AI Voice Briefings', desc: 'Daily executive briefings, on demand, in your language.' },
  { icon: ShieldCheck, title: 'Enterprise RBAC', desc: 'Role-based access from CEO to auditor — secure by default.' },
];

const Landing = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              Savvy AI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#solutions" className="hover:text-foreground transition">Solutions</a>
            <a href="#contact" className="hover:text-foreground transition">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Go to dashboard <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth?mode=signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-accent/40 text-xs mb-6">
          <Sparkles className="w-3 h-3 text-primary" /> AI-powered enterprise operations
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          The intelligent operating system for modern finance teams
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Savvy AI unifies finance, HR, collaboration and intelligent automation into one secure platform —
          built for organizations that move fast.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {user ? (
            <Button asChild size="lg">
              <Link to="/dashboard">Open dashboard <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/auth?mode=signup">Get started free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/auth">Log in</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="hover:shadow-lg transition">
              <CardContent className="p-6">
                <div className="size-10 rounded-lg bg-primary/10 grid place-items-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="solutions" className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">Ready to transform your operations?</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Join finance teams using Savvy AI to automate, collaborate, and decide faster.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link to={user ? '/dashboard' : '/auth?mode=signup'}>
                  {user ? 'Open dashboard' : 'Start free trial'} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer id="contact" className="border-t border-border/60 mt-12">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Savvy AI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/auth" className="hover:text-foreground">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
