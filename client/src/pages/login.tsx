import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, AlertCircle } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (login(username, password)) {
      setLocation("/");
    } else {
      setError("Invalid credentials. Try admin/admin123 or teacher_001/teacher123");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-100/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center">
            <img 
              src="/school-logo.png" 
              alt="University Basic School Logo" 
              className="h-24 w-24 object-contain drop-shadow-lg"
            />
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold text-blue-900">University Basic School</h1>
            <p className="text-sm font-italic text-blue-700 mt-1 tracking-wide">Knowledge, Truth and Excellence</p>
            <p className="text-xs text-muted-foreground mt-3">Administrative Management System</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle>Login to Your Account</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 ml-2">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin or teacher_001"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-10 shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold">Demo Credentials:</p>
              <div className="bg-secondary/50 p-3 rounded space-y-1 text-xs">
                <p><span className="font-mono font-bold">Admin:</span> admin / admin123</p>
                <p><span className="font-mono font-bold">Teacher:</span> teacher_001 / teacher123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
