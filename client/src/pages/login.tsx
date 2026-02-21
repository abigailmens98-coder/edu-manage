import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetSecret, setResetSecret] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(identifier, password);

    if (success) {
      setLocation("/");
    } else {
      setError("Invalid username or password. Check demo credentials below.");
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    // Password reset functionality can be added later
    setResetError("Password reset is currently unavailable. Please contact administrator.");
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
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-blue-900">University Basic School</h1>
            <p className="text-sm font-italic text-blue-700 mt-1 tracking-wide">Knowledge, Truth and Excellence</p>
            <p className="text-xs text-muted-foreground mt-3">Administrative Management System</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle>Login to Your Account</CardTitle>
            <CardDescription>Enter your email/username and password</CardDescription>
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
                <Label htmlFor="identifier">Email or Username</Label>
                <Input
                  id="identifier"
                  placeholder="admin or sarah@academia.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isLoading}
                  className="h-10"
                  data-testid="input-email-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-10 pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 shadow-lg shadow-primary/20 text-base font-semibold"
                disabled={isLoading}
                data-testid="button-submit-login"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full text-primary text-sm"
                onClick={() => setShowReset(true)}
                data-testid="button-forgot-password"
              >
                Forgot your password?
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t space-y-3 text-sm">
              <p className="font-semibold text-foreground">Demo Credentials:</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-blue-900">Admin:</p>
                  <p className="text-blue-800"><span className="font-mono">admin</span> / <span className="font-mono">admin123</span></p>
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Teacher:</p>
                  <p className="text-blue-800"><span className="font-mono">teacher_001</span> / <span className="font-mono">teacher123</span></p>
                  <p className="text-blue-800"><span className="font-mono">sarah@academia.edu</span> / <span className="font-mono">teacher123</span></p>
                  <p className="text-xs text-muted-foreground mt-1">All teacher accounts use password: <span className="font-mono">teacher123</span></p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
              Enter your email/username and secret word to reset your password
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {resetError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 ml-2">{resetError}</AlertDescription>
              </Alert>
            )}
            {resetMessage && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">{resetMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-identifier">Email or Username</Label>
              <Input
                id="reset-identifier"
                placeholder="admin or sarah@academia.edu"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                data-testid="input-reset-identifier"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-secret">Secret Word</Label>
              <Input
                id="reset-secret"
                placeholder="Your secret word"
                type="password"
                value={resetSecret}
                onChange={(e) => setResetSecret(e.target.value)}
                data-testid="input-reset-secret"
              />
              <p className="text-xs text-muted-foreground">Demo: teacher_001 → ghana, admin → governance</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReset(false)}
                className="flex-1"
                data-testid="button-cancel-reset"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                data-testid="button-reset-password"
              >
                Reset Password
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
