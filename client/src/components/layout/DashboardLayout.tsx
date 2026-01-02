import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileBarChart, 
  LayoutDashboard, 
  Settings,
  Bell,
  Search,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect, useRef } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface Student {
  id: string;
  name: string;
  classLevel: string;
}

interface Subject {
  id: string;
  name: string;
  classLevels: string[];
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ students: Student[]; subjects: Subject[] }>({ students: [], subjects: [] });
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const currentQuery = searchQuery.trim();
    
    if (currentQuery.length < 2) {
      setSearchResults({ students: [], subjects: [] });
      setShowResults(false);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    setShowResults(true);
    
    const searchData = async () => {
      try {
        const [studentsRes, subjectsRes] = await Promise.all([
          fetch("/api/students", { signal: controller.signal }),
          fetch("/api/subjects", { signal: controller.signal })
        ]);
        
        if (controller.signal.aborted) return;
        
        const students: Student[] = await studentsRes.json();
        const subjects: Subject[] = await subjectsRes.json();
        
        const query = currentQuery.toLowerCase();
        
        const filteredStudents = students.filter(s => 
          s.name.toLowerCase().includes(query) || 
          s.classLevel.toLowerCase().includes(query)
        ).slice(0, 5);
        
        const filteredSubjects = subjects.filter(s => 
          s.name.toLowerCase().includes(query)
        ).slice(0, 5);
        
        if (!controller.signal.aborted) {
          setSearchResults({ students: filteredStudents, subjects: filteredSubjects });
          setIsSearching(false);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Search error:", error);
          setIsSearching(false);
        }
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSelectStudent = (student: Student) => {
    setSearchQuery("");
    setShowResults(false);
    setLocation(`/students?highlight=${student.id}`);
  };

  const handleSelectSubject = (subject: Subject) => {
    setSearchQuery("");
    setShowResults(false);
    setLocation(`/subjects?highlight=${subject.id}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults({ students: [], subjects: [] });
    setShowResults(false);
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Students", href: "/students", icon: Users },
    { name: "Teachers", href: "/teachers", icon: GraduationCap },
    { name: "Academics", href: "/academics", icon: BookOpen },
    { name: "Subjects", href: "/subjects", icon: BookOpen },
    { name: "Terms", href: "/terms", icon: BookOpen },
    { name: "Reports", href: "/reports", icon: FileBarChart },
    { name: "Remarks", href: "/remarks", icon: FileBarChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-4 space-y-6">
        <div className="flex flex-col items-center gap-3 pb-4 border-b border-sidebar-border">
          <img 
            src="/school-logo.png" 
            alt="UBS Logo" 
            className="h-16 w-16 object-contain"
          />
          <div className="text-center">
            <div className="font-serif text-sm font-bold text-sidebar-foreground">University Basic School</div>
            <div className="text-xs text-sidebar-foreground/70">TARKWA</div>
          </div>
        </div>
        
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors block",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Admin User</span>
            <span className="text-xs text-sidebar-foreground/60">admin@academia.edu</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <div className="hidden md:flex relative w-96" ref={searchRef}>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Quick search students or subjects..." 
                className="pl-9 pr-9 bg-muted/50 border-none focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                data-testid="input-quick-search"
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1 h-6 w-6"
                  onClick={clearSearch}
                  data-testid="button-clear-search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              
              {showResults && (searchResults.students.length > 0 || searchResults.subjects.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-80 overflow-y-auto z-50" data-testid="dropdown-search-results">
                  {searchResults.students.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-semibold text-muted-foreground px-2 py-1 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        STUDENTS
                      </div>
                      {searchResults.students.map((student) => (
                        <button
                          key={student.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm flex items-center justify-between"
                          onClick={() => handleSelectStudent(student)}
                          data-testid={`search-result-student-${student.id}`}
                        >
                          <span className="font-medium">{student.name}</span>
                          <span className="text-xs text-muted-foreground">{student.classLevel}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchResults.subjects.length > 0 && (
                    <div className="p-2 border-t">
                      <div className="text-xs font-semibold text-muted-foreground px-2 py-1 flex items-center gap-2">
                        <BookOpen className="h-3 w-3" />
                        SUBJECTS
                      </div>
                      {searchResults.subjects.map((subject) => (
                        <button
                          key={subject.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm flex items-center justify-between"
                          onClick={() => handleSelectSubject(subject)}
                          data-testid={`search-result-subject-${subject.id}`}
                        >
                          <span className="font-medium">{subject.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {subject.classLevels?.length || 0} classes
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {showResults && isSearching && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground z-50">
                  Searching...
                </div>
              )}
              
              {showResults && !isSearching && searchQuery.length >= 2 && searchResults.students.length === 0 && searchResults.subjects.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground z-50" data-testid="text-no-results">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
