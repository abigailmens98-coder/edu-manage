import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Mail, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
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
      setError("Invalid username or password. Please check your credentials and try again.");
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

            <div className="mt-6 pt-4 border-t text-sm">
              <p className="text-muted-foreground text-center text-xs leading-relaxed">
                Don't have an account? Please contact the <span className="font-semibold text-blue-800">IT Department</span> or your <span className="font-semibold text-blue-800">School Administrator</span> to request access credentials.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-blue-800">B&P Code Lab</span>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> 0242099920
            </span>
            <span>|</span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> b&pcode@gmail.com
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
            data-testid="button-terms-of-use"
          >
            Terms of Use
          </button>
        </div>
      </div>

      {/* Terms of Use Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms of Use</DialogTitle>
            <DialogDescription>
              Please read these terms carefully before using this system.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <section>
                <h3 className="font-semibold text-foreground mb-1">1. Acceptance of Terms</h3>
                <p>
                  By accessing and using the University Basic School Administrative Management System, you agree to comply with and be bound by these Terms of Use. If you do not agree with any part of these terms, you must not use this system.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">2. Authorized Use</h3>
                <p>
                  This system is intended solely for authorized staff, teachers, and administrators of University Basic School. Unauthorized access or use of this system is strictly prohibited and may result in disciplinary action and/or legal proceedings.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">3. User Responsibilities</h3>
                <p>
                  Users are responsible for maintaining the confidentiality of their login credentials. You must not share your account information with any other person. Any activity that occurs under your account is your responsibility.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">4. Data Privacy & Confidentiality</h3>
                <p>
                  All student records, academic data, and personal information accessed through this system are confidential. Users must not disclose, copy, or distribute any data obtained from this system without proper authorization from the School Administration.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">5. System Integrity</h3>
                <p>
                  Users must not attempt to interfere with, disrupt, or compromise the security or functionality of this system. Any suspicious activity or security vulnerabilities should be reported immediately to the IT Department.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">6. Intellectual Property</h3>
                <p>
                  This system and its contents, including software, design, and documentation, are the intellectual property of B&P Code Lab. Unauthorized reproduction, modification, or distribution of any part of this system is prohibited.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">7. Limitation of Liability</h3>
                <p>
                  B&P Code Lab and University Basic School shall not be held liable for any loss or damage arising from the use of this system, including but not limited to data loss, system downtime, or unauthorized access resulting from user negligence.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">8. Modifications</h3>
                <p>
                  B&P Code Lab reserves the right to modify these Terms of Use at any time. Continued use of the system after changes constitutes acceptance of the updated terms.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">9. Contact</h3>
                <p>
                  For questions or concerns regarding these terms, please contact:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>B&P Code Lab — Phone: 0242099920</li>
                  <li>Email: b&pcode@gmail.com</li>
                </ul>
              </section>
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
            <Button
              onClick={() => setShowTerms(false)}
              className="w-full"
              data-testid="button-close-terms"
            >
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
